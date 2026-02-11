import os
import json
import uuid
from datetime import datetime, timezone

import pandas as pd
import psycopg
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

DB_URL = os.getenv("DATABASE_URL", "postgresql://fx:fxpass@localhost:5432/fxdb")

def main():
    conn = psycopg.connect(DB_URL)

    df = pd.read_sql(
        """
        SELECT created_at, key, spend, realized_profit, predicted_ev
        FROM outcomes_log
        WHERE created_at >= NOW() - INTERVAL '30 days'
        """,
        conn
    )

    if df.empty:
        print("No outcomes; skipping training.")
        return

    df["realized_ev"] = df["realized_profit"] / df["spend"].clip(lower=1e-6)
    df["success"] = (df["realized_ev"] >= (df["predicted_ev"] * 1.05)).astype(int)

    parts = df["key"].str.split("|", expand=True)
    parts.columns = ["channel", "campaign", "segment", "moment", "creative", "offer"]

    feats = pd.get_dummies(parts[["channel", "moment"]], drop_first=True)
    X = feats
    y = df["success"]

    if X.shape[0] < 50 or y.nunique() < 2:
        print("Not enough diverse data; skipping.")
        return

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=7, stratify=y
    )

    model = LogisticRegression(max_iter=300)
    model.fit(X_train, y_train)

    pred = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, pred)
    print("AUC:", auc)

    as_of = datetime.now(timezone.utc)
    model_version = f"p_action_{as_of.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"

    # Store model registry
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO model_registry (model_name, version, metadata) VALUES (%s, %s, %s)",
            ("p_action", model_version, json.dumps({"auc": auc, "features": list(X.columns)}))
        )
        conn.commit()

    # Robust medians for basic priors
    med_profit = df.groupby("key")["realized_profit"].median()
    med_spend = df.groupby("key")["spend"].median().clip(lower=1e-6)
    med_ev = (med_profit / med_spend).clip(lower=0.0)

    margin_rate = 0.40
    expected_cpa = 50.0
    incrementality = 1.0

    unique_keys = parts.copy()
    unique_keys["key"] = df["key"]
    unique_keys = unique_keys.drop_duplicates("key")

    key_feats = pd.get_dummies(unique_keys[["channel", "moment"]], drop_first=True)
    for col in X.columns:
        if col not in key_feats.columns:
            key_feats[col] = 0
    key_feats = key_feats[X.columns]

    p_action = model.predict_proba(key_feats)[:, 1]

    with conn.cursor() as cur:
        for k, p in zip(unique_keys["key"].tolist(), p_action):
            p = float(max(0.001, min(0.99, p)))
            base_ev = float(med_ev.get(k, 1.0))

            # back-calc ltv_uplift prior from EV/₹ for consistency
            ltv_uplift = (base_ev * expected_cpa) / (p * margin_rate)
            ltv_uplift = float(max(50.0, min(5000.0, ltv_uplift)))

            cur.execute(
                """
                INSERT INTO model_predictions
                (key, as_of, model_version, p_action, ltv_uplift, margin_rate, expected_cpa, incrementality)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (key, as_of) DO NOTHING
                """,
                (k, as_of, model_version, p, ltv_uplift, margin_rate, expected_cpa, incrementality)
            )

        conn.commit()

    print("Nightly training complete:", model_version)

if __name__ == "__main__":
    main()
