import json
import os
from datetime import datetime, timezone
from confluent_kafka import Consumer
import requests

# Add service module to path when running from jobs/
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "service"))

from db import upsert_outcomes_agg

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "fx_outcomes")
GROUP = os.getenv("KAFKA_GROUP", "fx_outcome_consumers")
OPTIMIZER_UPDATE_URL = os.getenv("OPTIMIZER_UPDATE_URL", "http://localhost:8000/update")

def floor_to_5min(dt: datetime) -> datetime:
    minute = (dt.minute // 5) * 5
    return dt.replace(minute=minute, second=0, microsecond=0)

def main():
    c = Consumer({
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": GROUP,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    })
    c.subscribe([TOPIC])

    while True:
        msg = c.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            continue

        payload = json.loads(msg.value().decode("utf-8"))

        ts = datetime.fromisoformat(payload["ts"].replace("Z", "+00:00")).astimezone(timezone.utc)
        window = floor_to_5min(ts)

        key = payload["key"]
        spend = float(payload.get("spend", 0.0))
        impressions = int(payload.get("impressions", 0))
        clicks = int(payload.get("clicks", 0))
        actions = int(payload.get("actions", 0))
        revenue = float(payload.get("revenue", 0.0))
        profit_proxy = float(payload.get("profit_proxy", 0.0))
        predicted_ev = float(payload.get("predicted_ev", 0.0))
        operator_id = payload.get("operator_id")
        inventory_owner_id = payload.get("inventory_owner_id")
        inventory_id = payload.get("inventory_id")
        inventory_type = payload.get("inventory_type")
        rights_type = payload.get("rights_type")
        campaign_id = payload.get("campaign_id")
        channel = payload.get("channel")
        placement_ref = payload.get("placement_ref")

        # 1) persist aggregate
        upsert_outcomes_agg(
            window_start_iso=window.isoformat(),
            key=key,
            spend=spend,
            impressions=impressions,
            clicks=clicks,
            actions=actions,
            revenue=revenue,
            profit_proxy=profit_proxy,
        )

        # 2) update bandit immediately
        if spend > 0:
            req = {
                "outcomes": [{
                    "key": key,
                    "spend": spend,
                    "realized_profit": profit_proxy,
                    "predicted_ev": predicted_ev,
                    "weight": max(1.0, spend / 100.0),
                    "impressions": impressions,
                    "conversions": actions,
                    "operator_id": operator_id,
                    "inventory_owner_id": inventory_owner_id,
                    "inventory_id": inventory_id,
                    "inventory_type": inventory_type,
                    "rights_type": rights_type,
                    "campaign_id": campaign_id,
                    "channel": channel,
                    "placement_ref": placement_ref,
                }]
            }
            try:
                requests.post(OPTIMIZER_UPDATE_URL, json=req, timeout=1.5)
            except Exception:
                pass

if __name__ == "__main__":
    main()
