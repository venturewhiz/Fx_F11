import os
from typing import Dict, Tuple, List, Optional
from contextlib import contextmanager
import psycopg

DB_URL = os.getenv("DATABASE_URL", "postgresql://fx:fxpass@localhost:5432/fxdb")

@contextmanager
def get_conn():
    conn = psycopg.connect(DB_URL)
    try:
        yield conn
    finally:
        conn.close()

# ----------------------------
# Policy State (Bandit)
# ----------------------------

def load_policy_state(keys: List[str]) -> Dict[str, Tuple[float, float]]:
    if not keys:
        return {}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT key, alpha, beta FROM policy_state WHERE key = ANY(%s)", (keys,))
        rows = cur.fetchall()
    return {k: (a, b) for k, a, b in rows}

def upsert_policy_state(updates: Dict[str, Tuple[float, float]]):
    if not updates:
        return
    with get_conn() as conn, conn.cursor() as cur:
        for key, (alpha, beta) in updates.items():
            cur.execute(
                """
                INSERT INTO policy_state (key, alpha, beta)
                VALUES (%s, %s, %s)
                ON CONFLICT (key) DO UPDATE SET
                  alpha = EXCLUDED.alpha,
                  beta  = EXCLUDED.beta,
                  updated_at = NOW()
                """,
                (key, alpha, beta)
            )
        conn.commit()

# ----------------------------
# Allocation & Outcomes Logs
# ----------------------------

def log_allocations(run_id, records: List[dict]):
    if not records:
        return
    with get_conn() as conn, conn.cursor() as cur:
        for r in records:
            cur.execute(
                """
                INSERT INTO allocations_log
                (run_id, key, operator_id, inventory_owner_id, inventory_id, inventory_type, rights_type, campaign_id, channel, placement_ref,
                 allocated_budget, score, base_ev, moment_multiplier)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    run_id,
                    r["key"],
                    r.get("operator_id"),
                    r.get("inventory_owner_id"),
                    r.get("inventory_id"),
                    r.get("inventory_type"),
                    r.get("rights_type"),
                    r.get("campaign_id"),
                    r.get("channel"),
                    r.get("placement_ref"),
                    r["allocated_budget"],
                    r.get("score"),
                    r.get("base_ev"),
                    r.get("moment_multiplier"),
                )
            )
        conn.commit()

def log_outcomes(run_id, outcomes: List[dict]):
    if not outcomes:
        return
    with get_conn() as conn, conn.cursor() as cur:
        for o in outcomes:
            cur.execute(
                """
                INSERT INTO outcomes_log
                (run_id, key, operator_id, inventory_owner_id, inventory_id, inventory_type, rights_type, campaign_id, channel, placement_ref,
                 spend, impressions, conversions, realized_profit, predicted_ev)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    o.get("run_id", run_id),
                    o["key"],
                    o.get("operator_id"),
                    o.get("inventory_owner_id"),
                    o.get("inventory_id"),
                    o.get("inventory_type"),
                    o.get("rights_type"),
                    o.get("campaign_id"),
                    o.get("channel"),
                    o.get("placement_ref"),
                    o["spend"],
                    int(o.get("impressions", 0)),
                    int(o.get("conversions", 0)),
                    o["realized_profit"],
                    o["predicted_ev"],
                )
            )
        conn.commit()

# ----------------------------
# Streaming aggregates
# ----------------------------

def upsert_outcomes_agg(window_start_iso: str, key: str, spend: float, impressions: int, clicks: int, actions: int, revenue: float, profit_proxy: float):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO outcomes_agg_5m (window_start, key, spend, impressions, clicks, actions, revenue, profit_proxy)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (window_start, key) DO UPDATE SET
              spend = outcomes_agg_5m.spend + EXCLUDED.spend,
              impressions = outcomes_agg_5m.impressions + EXCLUDED.impressions,
              clicks = outcomes_agg_5m.clicks + EXCLUDED.clicks,
              actions = outcomes_agg_5m.actions + EXCLUDED.actions,
              revenue = outcomes_agg_5m.revenue + EXCLUDED.revenue,
              profit_proxy = outcomes_agg_5m.profit_proxy + EXCLUDED.profit_proxy
            """,
            (window_start_iso, key, spend, impressions, clicks, actions, revenue, profit_proxy)
        )
        conn.commit()

# ----------------------------
# Model predictions (nightly)
# ----------------------------

def latest_model_predictions(keys: List[str]) -> Dict[str, dict]:
    if not keys:
        return {}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT mp.key, mp.as_of, mp.model_version, mp.p_action, mp.ltv_uplift, mp.margin_rate, mp.expected_cpa, mp.incrementality
            FROM model_predictions mp
            JOIN (
              SELECT key, MAX(as_of) AS max_as_of
              FROM model_predictions
              WHERE key = ANY(%s)
              GROUP BY key
            ) x ON x.key = mp.key AND x.max_as_of = mp.as_of
            """,
            (keys,)
        )
        rows = cur.fetchall()

    out = {}
    for (k, as_of, ver, p, ltv, margin, cpa, inc) in rows:
        out[k] = {
            "p_action": float(p),
            "ltv_uplift": float(ltv),
            "margin_rate": float(margin),
            "expected_cpa": float(cpa),
            "incrementality": float(inc),
            "model_version": ver,
            "as_of": str(as_of),
        }
    return out

# ----------------------------
# Admin / Setup CRUD
# ----------------------------

def create_tenant(tenant_id: str, name: str, metadata: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO tenants (tenant_id, name, metadata)
               VALUES (%s, %s, %s)
               ON CONFLICT (tenant_id) DO UPDATE SET name=EXCLUDED.name, metadata=EXCLUDED.metadata
               RETURNING tenant_id, name, metadata, created_at""",
            (tenant_id, name, metadata)
        )
        row = cur.fetchone()
        conn.commit()
    return {"tenant_id": row[0], "name": row[1], "metadata": row[2], "created_at": str(row[3])}

def list_tenants() -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT tenant_id, name, metadata, created_at FROM tenants ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [{"tenant_id": r[0], "name": r[1], "metadata": r[2], "created_at": str(r[3])} for r in rows]

def create_campaign(campaign_id: str, tenant_id: str, channel: str, name: str, objective: Optional[str], status: str, metadata: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO campaigns (campaign_id, tenant_id, channel, name, objective, status, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (campaign_id) DO UPDATE SET
                 tenant_id=EXCLUDED.tenant_id, channel=EXCLUDED.channel, name=EXCLUDED.name,
                 objective=EXCLUDED.objective, status=EXCLUDED.status, metadata=EXCLUDED.metadata
               RETURNING campaign_id, tenant_id, channel, name, objective, status, metadata, created_at""",
            (campaign_id, tenant_id, channel, name, objective, status, metadata)
        )
        row = cur.fetchone()
        conn.commit()
    return {"campaign_id": row[0], "tenant_id": row[1], "channel": row[2], "name": row[3], "objective": row[4], "status": row[5], "metadata": row[6], "created_at": str(row[7])}

def list_campaigns(tenant_id: Optional[str] = None) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        if tenant_id:
            cur.execute(
                "SELECT campaign_id, tenant_id, channel, name, objective, status, metadata, created_at FROM campaigns WHERE tenant_id=%s ORDER BY created_at DESC",
                (tenant_id,),
            )
        else:
            cur.execute(
                "SELECT campaign_id, tenant_id, channel, name, objective, status, metadata, created_at FROM campaigns ORDER BY created_at DESC"
            )
        rows = cur.fetchall()
    return [{"campaign_id": r[0], "tenant_id": r[1], "channel": r[2], "name": r[3], "objective": r[4], "status": r[5], "metadata": r[6], "created_at": str(r[7])} for r in rows]

def create_segment(segment_id: str, tenant_id: str, name: str, definition: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO segments (segment_id, tenant_id, name, definition)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (segment_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id, name=EXCLUDED.name, definition=EXCLUDED.definition
               RETURNING segment_id, tenant_id, name, definition, created_at""",
            (segment_id, tenant_id, name, definition)
        )
        row = cur.fetchone()
        conn.commit()
    return {"segment_id": row[0], "tenant_id": row[1], "name": row[2], "definition": row[3], "created_at": str(row[4])}

def list_segments(tenant_id: Optional[str] = None) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        if tenant_id:
            cur.execute(
                "SELECT segment_id, tenant_id, name, definition, created_at FROM segments WHERE tenant_id=%s ORDER BY created_at DESC",
                (tenant_id,),
            )
        else:
            cur.execute("SELECT segment_id, tenant_id, name, definition, created_at FROM segments ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [{"segment_id": r[0], "tenant_id": r[1], "name": r[2], "definition": r[3], "created_at": str(r[4])} for r in rows]

def create_creative(creative_id: str, tenant_id: str, name: str, metadata: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO creatives (creative_id, tenant_id, name, metadata)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (creative_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id, name=EXCLUDED.name, metadata=EXCLUDED.metadata
               RETURNING creative_id, tenant_id, name, metadata, created_at""",
            (creative_id, tenant_id, name, metadata)
        )
        row = cur.fetchone()
        conn.commit()
    return {"creative_id": row[0], "tenant_id": row[1], "name": row[2], "metadata": row[3], "created_at": str(row[4])}

def list_creatives(tenant_id: Optional[str] = None) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        if tenant_id:
            cur.execute(
                "SELECT creative_id, tenant_id, name, metadata, created_at FROM creatives WHERE tenant_id=%s ORDER BY created_at DESC",
                (tenant_id,),
            )
        else:
            cur.execute("SELECT creative_id, tenant_id, name, metadata, created_at FROM creatives ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [{"creative_id": r[0], "tenant_id": r[1], "name": r[2], "metadata": r[3], "created_at": str(r[4])} for r in rows]

def create_offer(offer_id: str, tenant_id: str, name: str, metadata: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO offers (offer_id, tenant_id, name, metadata)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (offer_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id, name=EXCLUDED.name, metadata=EXCLUDED.metadata
               RETURNING offer_id, tenant_id, name, metadata, created_at""",
            (offer_id, tenant_id, name, metadata)
        )
        row = cur.fetchone()
        conn.commit()
    return {"offer_id": row[0], "tenant_id": row[1], "name": row[2], "metadata": row[3], "created_at": str(row[4])}

def list_offers(tenant_id: Optional[str] = None) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        if tenant_id:
            cur.execute(
                "SELECT offer_id, tenant_id, name, metadata, created_at FROM offers WHERE tenant_id=%s ORDER BY created_at DESC",
                (tenant_id,),
            )
        else:
            cur.execute("SELECT offer_id, tenant_id, name, metadata, created_at FROM offers ORDER BY created_at DESC")
        rows = cur.fetchall()
    return [{"offer_id": r[0], "tenant_id": r[1], "name": r[2], "metadata": r[3], "created_at": str(r[4])} for r in rows]

def upsert_integration(tenant_id: str, kind: str, config: Optional[dict]) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO integrations (tenant_id, kind, config)
               VALUES (%s, %s, %s)
               ON CONFLICT (tenant_id, kind) DO UPDATE SET config=EXCLUDED.config, updated_at=NOW()
               RETURNING tenant_id, kind, config, created_at, updated_at""",
            (tenant_id, kind, config),
        )
        row = cur.fetchone()
        conn.commit()
    return {"tenant_id": row[0], "kind": row[1], "config": row[2], "created_at": str(row[3]), "updated_at": str(row[4])}

def list_integrations(tenant_id: str) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT tenant_id, kind, config, created_at, updated_at FROM integrations WHERE tenant_id=%s ORDER BY kind",
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [{"tenant_id": r[0], "kind": r[1], "config": r[2], "created_at": str(r[3]), "updated_at": str(r[4])} for r in rows]

# ----------------------------
# Rights access + settlement rules
# ----------------------------

def upsert_inventory_access(
    operator_id: str,
    inventory_id: str,
    inventory_owner_id: str,
    inventory_type: str,
    rights_type: str,
    allowed_channels: Optional[List[str]],
    active: bool,
    effective_from,
    effective_to,
    metadata: Optional[dict],
) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO inventory_access
               (operator_id, inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels, active, effective_from, effective_to, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s, COALESCE(%s, NOW()), %s, %s)
               ON CONFLICT (operator_id, inventory_id) DO UPDATE SET
                 inventory_owner_id=EXCLUDED.inventory_owner_id,
                 inventory_type=EXCLUDED.inventory_type,
                 rights_type=EXCLUDED.rights_type,
                 allowed_channels=EXCLUDED.allowed_channels,
                 active=EXCLUDED.active,
                 effective_from=EXCLUDED.effective_from,
                 effective_to=EXCLUDED.effective_to,
                 metadata=EXCLUDED.metadata,
                 updated_at=NOW()
               RETURNING operator_id, inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels, active, effective_from, effective_to, metadata""",
            (operator_id, inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels or [], active, effective_from, effective_to, metadata),
        )
        row = cur.fetchone()
        conn.commit()
    return {
        "operator_id": row[0],
        "inventory_id": row[1],
        "inventory_owner_id": row[2],
        "inventory_type": row[3],
        "rights_type": row[4],
        "allowed_channels": row[5],
        "active": row[6],
        "effective_from": str(row[7]),
        "effective_to": str(row[8]) if row[8] else None,
        "metadata": row[9],
    }

def list_inventory_access(operator_id: Optional[str] = None) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        if operator_id:
            cur.execute(
                """SELECT operator_id, inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels, active,
                          effective_from, effective_to, metadata, created_at, updated_at
                   FROM inventory_access WHERE operator_id=%s ORDER BY updated_at DESC""",
                (operator_id,),
            )
        else:
            cur.execute(
                """SELECT operator_id, inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels, active,
                          effective_from, effective_to, metadata, created_at, updated_at
                   FROM inventory_access ORDER BY updated_at DESC"""
            )
        rows = cur.fetchall()
    return [
        {
            "operator_id": r[0],
            "inventory_id": r[1],
            "inventory_owner_id": r[2],
            "inventory_type": r[3],
            "rights_type": r[4],
            "allowed_channels": r[5],
            "active": r[6],
            "effective_from": str(r[7]),
            "effective_to": str(r[8]) if r[8] else None,
            "metadata": r[9],
            "created_at": str(r[10]),
            "updated_at": str(r[11]),
        }
        for r in rows
    ]

def get_inventory_access_map(operator_id: str, inventory_ids: List[str]) -> Dict[str, dict]:
    if not inventory_ids:
        return {}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT inventory_id, inventory_owner_id, inventory_type, rights_type, allowed_channels, active,
                      effective_from, effective_to, metadata
               FROM inventory_access
               WHERE operator_id=%s AND inventory_id = ANY(%s)""",
            (operator_id, inventory_ids),
        )
        rows = cur.fetchall()

    out = {}
    for r in rows:
        out[r[0]] = {
            "inventory_owner_id": r[1],
            "inventory_type": r[2],
            "rights_type": r[3],
            "allowed_channels": r[4] or [],
            "active": r[5],
            "effective_from": r[6],
            "effective_to": r[7],
            "metadata": r[8] or {},
        }
    return out

def create_revenue_rule(
    rule_id: str,
    operator_type: str,
    inventory_type: str,
    operator_fee_pct: float,
    inventory_owner_pct: float,
    platform_fee_pct: float,
    effective_from,
    effective_to,
    metadata: Optional[dict],
) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO revenue_rules
               (rule_id, operator_type, inventory_type, operator_fee_pct, inventory_owner_pct, platform_fee_pct, effective_from, effective_to, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s, NOW()), %s, %s)
               ON CONFLICT (rule_id) DO UPDATE SET
                 operator_type=EXCLUDED.operator_type,
                 inventory_type=EXCLUDED.inventory_type,
                 operator_fee_pct=EXCLUDED.operator_fee_pct,
                 inventory_owner_pct=EXCLUDED.inventory_owner_pct,
                 platform_fee_pct=EXCLUDED.platform_fee_pct,
                 effective_from=EXCLUDED.effective_from,
                 effective_to=EXCLUDED.effective_to,
                 metadata=EXCLUDED.metadata
               RETURNING rule_id, operator_type, inventory_type, operator_fee_pct, inventory_owner_pct, platform_fee_pct, effective_from, effective_to, metadata, created_at""",
            (rule_id, operator_type, inventory_type, operator_fee_pct, inventory_owner_pct, platform_fee_pct, effective_from, effective_to, metadata),
        )
        row = cur.fetchone()
        conn.commit()
    return {
        "rule_id": row[0],
        "operator_type": row[1],
        "inventory_type": row[2],
        "operator_fee_pct": float(row[3]),
        "inventory_owner_pct": float(row[4]),
        "platform_fee_pct": float(row[5]),
        "effective_from": str(row[6]),
        "effective_to": str(row[7]) if row[7] else None,
        "metadata": row[8],
        "created_at": str(row[9]),
    }

def list_revenue_rules() -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT rule_id, operator_type, inventory_type, operator_fee_pct, inventory_owner_pct, platform_fee_pct,
                      effective_from, effective_to, metadata, created_at
               FROM revenue_rules ORDER BY created_at DESC"""
        )
        rows = cur.fetchall()
    return [
        {
            "rule_id": r[0],
            "operator_type": r[1],
            "inventory_type": r[2],
            "operator_fee_pct": float(r[3]),
            "inventory_owner_pct": float(r[4]),
            "platform_fee_pct": float(r[5]),
            "effective_from": str(r[6]),
            "effective_to": str(r[7]) if r[7] else None,
            "metadata": r[8],
            "created_at": str(r[9]),
        }
        for r in rows
    ]

def run_shadow_settlement(settlement_date: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM settlement_ledger_daily WHERE settlement_date=%s", (settlement_date,))

        cur.execute(
            """
            WITH base AS (
              SELECT
                DATE(created_at) AS settlement_date,
                COALESCE(operator_id, 'unknown_operator') AS operator_id,
                COALESCE(inventory_owner_id, COALESCE(operator_id, 'unknown_owner')) AS inventory_owner_id,
                COALESCE(inventory_id, 'unknown_inventory') AS inventory_id,
                COALESCE(channel, split_part(key, '|', 1)) AS channel,
                COALESCE(inventory_type, 'owned') AS inventory_type,
                SUM(spend) AS gross_spend,
                SUM(impressions) AS impressions,
                SUM(conversions) AS conversions
              FROM outcomes_log
              WHERE DATE(created_at) = %s
              GROUP BY 1,2,3,4,5,6
            )
            INSERT INTO settlement_ledger_daily
              (settlement_date, operator_id, inventory_owner_id, inventory_id, channel, gross_spend, impressions, conversions,
               operator_share, owner_share, platform_share, rule_id)
            SELECT
              b.settlement_date,
              b.operator_id,
              b.inventory_owner_id,
              b.inventory_id,
              b.channel,
              b.gross_spend,
              b.impressions,
              b.conversions,
              CASE
                WHEN b.operator_id = b.inventory_owner_id THEN b.gross_spend
                ELSE b.gross_spend * COALESCE(rr.operator_fee_pct, 0.0)
              END AS operator_share,
              CASE
                WHEN b.operator_id = b.inventory_owner_id THEN 0.0
                ELSE b.gross_spend * COALESCE(rr.inventory_owner_pct, 1.0)
              END AS owner_share,
              CASE
                WHEN b.operator_id = b.inventory_owner_id THEN 0.0
                ELSE b.gross_spend * COALESCE(rr.platform_fee_pct, 0.0)
              END AS platform_share,
              rr.rule_id
            FROM base b
            LEFT JOIN tenants t ON t.tenant_id = b.operator_id
            LEFT JOIN LATERAL (
                SELECT rule_id, operator_fee_pct, inventory_owner_pct, platform_fee_pct
                FROM revenue_rules
                WHERE operator_type = COALESCE(t.metadata->>'type', 'club')
                  AND inventory_type = b.inventory_type
                  AND effective_from <= (%s::date + INTERVAL '1 day')
                  AND (effective_to IS NULL OR effective_to >= %s::date)
                ORDER BY effective_from DESC
                LIMIT 1
            ) rr ON TRUE
            """,
            (settlement_date, settlement_date, settlement_date),
        )
        conn.commit()

def settlement_summary(settlement_date: str) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT settlement_date, operator_id, inventory_owner_id, inventory_id, channel,
                      gross_spend, impressions, conversions, operator_share, owner_share, platform_share, rule_id
               FROM settlement_ledger_daily
               WHERE settlement_date=%s
               ORDER BY gross_spend DESC""",
            (settlement_date,),
        )
        rows = cur.fetchall()
    return [
        {
            "settlement_date": str(r[0]),
            "operator_id": r[1],
            "inventory_owner_id": r[2],
            "inventory_id": r[3],
            "channel": r[4],
            "gross_spend": float(r[5]),
            "impressions": int(r[6]),
            "conversions": int(r[7]),
            "operator_share": float(r[8]),
            "owner_share": float(r[9]),
            "platform_share": float(r[10]),
            "rule_id": r[11],
        }
        for r in rows
    ]

# ----------------------------
# Monitoring queries for UI
# ----------------------------

def list_runs(limit: int = 10) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT run_id, MAX(timestamp) AS ts FROM allocations_log GROUP BY run_id ORDER BY ts DESC LIMIT %s",
            (limit,)
        )
        rows = cur.fetchall()
    return [{"run_id": str(r[0]), "timestamp": str(r[1])} for r in rows]

def allocations_for_run(run_id: str, limit: int = 200) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT key, channel, campaign_id, inventory_id, inventory_type, rights_type, operator_id, inventory_owner_id,
                      allocated_budget, score, base_ev, moment_multiplier
               FROM allocations_log
               WHERE run_id = %s
               ORDER BY allocated_budget DESC
               LIMIT %s""",
            (run_id, limit)
        )
        rows = cur.fetchall()

    out = []
    for row in rows:
        out.append(
            {
                "key": row[0],
                "channel": row[1] or (row[0].split("|", 1)[0] if row[0] else ""),
                "campaign_id": row[2],
                "inventory_id": row[3],
                "inventory_type": row[4],
                "rights_type": row[5],
                "operator_id": row[6],
                "inventory_owner_id": row[7],
                "allocated_budget": float(row[8]),
                "score": float(row[9]) if row[9] is not None else None,
                "base_ev": float(row[10]) if row[10] is not None else None,
                "moment_multiplier": float(row[11]) if row[11] is not None else None,
            }
        )
    return out

def list_policy_state(limit: int = 25) -> List[dict]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT key, alpha, beta, updated_at FROM policy_state ORDER BY updated_at DESC LIMIT %s", (limit,))
        rows = cur.fetchall()
    return [{"key": r[0], "alpha": float(r[1]), "beta": float(r[2]), "updated_at": str(r[3])} for r in rows]
