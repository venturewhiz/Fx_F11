from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Dict, Any

app = FastAPI(title="Fx Rewards")

# In-memory (replace with DB + chain settlement worker)
seen = set()
daily = {}
queue = []

class ActivityEvent(BaseModel):
    tenant_id: str
    fan_id: str
    activity_type: str
    timestamp_utc: str
    metadata: Dict[str, Any]
    idempotency_key: str

RULES = {
    "watch_minutes":    {"points_per_unit":2,"unit_key":"minutes","cap_per_day":120},
    "content_complete": {"points_per_unit":15,"unit_key":"count","cap_per_day":60},
    "ticket_purchase":  {"points_per_unit":1,"unit_key":"order_value","cap_per_day":5000},
    "merch_purchase":   {"points_per_unit":1,"unit_key":"order_value","cap_per_day":5000},
    "subscription_purchase":{"points_per_unit":250,"unit_key":"count","cap_per_day":250},
    "social_share":     {"points_per_unit":10,"unit_key":"count","cap_per_day":100},
    "referral_signup":  {"points_per_unit":75,"unit_key":"count","cap_per_day":300},
    "event_attendance": {"points_per_unit":150,"unit_key":"count","cap_per_day":150},
}

def daykey():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_wallet(tenant_id: str, fan_id: str) -> str:
    return f"0xCUSTODIAL_{tenant_id}_{fan_id}"

@app.post("/rewards/activity")
def activity(evt: ActivityEvent):
    if evt.idempotency_key in seen:
        return {"status":"duplicate_ignored"}
    seen.add(evt.idempotency_key)

    r = RULES.get(evt.activity_type)
    if not r:
        return {"status":"no_award","reason":"no_rule"}

    units = int(evt.metadata.get(r["unit_key"], 0) or evt.metadata.get("count", 1) or 1)
    raw = int(r["points_per_unit"] * units)

    dk = (evt.tenant_id, evt.fan_id, daykey())
    earned = daily.get(dk, 0)
    remaining = max(0, int(r["cap_per_day"]) - earned)
    pts = max(0, min(raw, remaining))

    if pts <= 0:
        return {"status":"no_award","reason":"cap_reached_or_zero"}

    daily[dk] = earned + pts
    wallet = get_wallet(evt.tenant_id, evt.fan_id)
    queue.append({"wallet": wallet, "points": pts, "id": evt.idempotency_key})
    return {"status":"queued_for_mint","points": pts, "wallet_address": wallet}

@app.post("/rewards/settle")
def settle(max_batch: int = 50):
    batch = queue[:max_batch]
    del queue[:max_batch]
    receipts = [{"tx_hash": f"0xSIM_{b['id']}", **b} for b in batch]
    return {"status":"submitted","count": len(receipts), "receipts": receipts}
