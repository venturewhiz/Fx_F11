from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Fx Entitlements")

class CheckReq(BaseModel):
    tenant_id: str
    fan_id: str
    wallet_address: str
    xp_tier: str = "BRONZE"

TIER_RANK = {"BRONZE":1,"SILVER":2,"GOLD":3,"VIP":4}
def tier_ok(user: str, req: str) -> bool:
    return TIER_RANK.get(user,0) >= TIER_RANK.get(req,0)

def get_fxp_balance(_wallet: str) -> int:
    return 1200  # stub chain read

RULES = [
  {"entitlement":"INSIDER_CONTENT","min_fxp":150,"min_tier":"BRONZE"},
  {"entitlement":"GATED_LIVE_CHAT","min_fxp":250,"min_tier":"SILVER"},
  {"entitlement":"GATED_STREAM","min_fxp":500,"min_tier":"SILVER"},
  {"entitlement":"PRIORITY_TICKET_ACCESS","min_fxp":1000,"min_tier":"GOLD"},
  {"entitlement":"FAN_ONLY_EVENT_ENTRY","min_fxp":2000,"min_tier":"GOLD"},
]

@app.post("/entitlements/check")
def check(req: CheckReq):
    bal = get_fxp_balance(req.wallet_address)
    results = []
    for r in RULES:
        results.append({**r, "allowed": (bal >= r["min_fxp"]) and tier_ok(req.xp_tier, r["min_tier"])})
    return {"wallet_balance_fxp": bal, "results": results}
