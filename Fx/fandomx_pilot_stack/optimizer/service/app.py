from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
import os

from fx_engine import DecisionUnit, UnitSignals, Constraints, allocate_budget
from keys import make_key
from bandit import ThompsonBandit
from db import (
    load_policy_state,
    upsert_policy_state,
    log_allocations,
    log_outcomes,
    latest_model_predictions,
    create_tenant,
    list_tenants,
    create_campaign,
    create_segment,
    create_creative,
    create_offer,
    list_campaigns,
    list_segments,
    list_creatives,
    list_offers,
    upsert_integration,
    list_integrations,
    upsert_inventory_access,
    list_inventory_access,
    get_inventory_access_map,
    create_revenue_rule,
    list_revenue_rules,
    run_shadow_settlement,
    settlement_summary,
    list_runs,
    allocations_for_run,
    list_policy_state,
)

APP_VERSION = "1.2.0-rights-settlement"
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "").strip()

app = FastAPI(title="FandomX Fx Optimizer", version=APP_VERSION)
app.mount("/ui", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True), name="ui")


def require_admin(x_admin_token: Optional[str]):
    if ADMIN_TOKEN and (x_admin_token or "") != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")


class DecisionUnitPayload(BaseModel):
    channel: str
    campaign_id: str
    segment_id: str
    moment: str
    creative_id: str
    offer_id: str
    inventory_id: str = ""
    inventory_type: str = ""
    operator_id: str = ""
    inventory_owner_id: str = ""
    rights_type: str = ""
    placement_ref: str = ""
    format_compatible: bool = True
    category_allowed: bool = True


class UnitSignalsPayload(BaseModel):
    p_action: float
    ltv_uplift: float
    margin_rate: float
    expected_cost_per_action: float
    max_spend: float
    min_spend: float = 0.0
    fatigue_score: float = 0.0
    freq_cap_ok: bool = True
    brand_safe: bool = True
    eligible: bool = True
    incrementality: float = 1.0


class OptimizeRequest(BaseModel):
    total_budget: float
    exploration_ratio: float = 0.08
    units: List[DecisionUnitPayload]
    signals: Optional[Dict[str, UnitSignalsPayload]] = None
    operator_id: Optional[str] = None
    moment_multipliers: Optional[Dict[str, float]] = {}
    channel_min: Optional[Dict[str, float]] = {}
    channel_max: Optional[Dict[str, float]] = {}
    campaign_min: Optional[Dict[str, float]] = {}
    campaign_max: Optional[Dict[str, float]] = {}
    previous_allocations: Optional[Dict[str, float]] = {}
    moment_spike_active: bool = False


class OutcomePayload(BaseModel):
    run_id: Optional[str] = None
    key: str
    spend: float
    realized_profit: float
    predicted_ev: float
    weight: float = 1.0
    impressions: int = 0
    conversions: int = 0
    operator_id: Optional[str] = None
    inventory_owner_id: Optional[str] = None
    inventory_id: Optional[str] = None
    inventory_type: Optional[str] = None
    rights_type: Optional[str] = None
    campaign_id: Optional[str] = None
    channel: Optional[str] = None
    placement_ref: Optional[str] = None


class UpdateRequest(BaseModel):
    outcomes: List[OutcomePayload]


class TenantPayload(BaseModel):
    tenant_id: str
    name: str
    metadata: Optional[dict] = None


class CampaignPayload(BaseModel):
    campaign_id: str
    tenant_id: str
    channel: str
    name: str
    objective: Optional[str] = None
    status: str = "active"
    metadata: Optional[dict] = None


class SegmentPayload(BaseModel):
    segment_id: str
    tenant_id: str
    name: str
    definition: Optional[dict] = None


class CreativePayload(BaseModel):
    creative_id: str
    tenant_id: str
    name: str
    metadata: Optional[dict] = None


class OfferPayload(BaseModel):
    offer_id: str
    tenant_id: str
    name: str
    metadata: Optional[dict] = None


class IntegrationPayload(BaseModel):
    tenant_id: str
    kind: str
    config: Optional[dict] = None


class InventoryAccessPayload(BaseModel):
    operator_id: str
    inventory_id: str
    inventory_owner_id: str
    inventory_type: str
    rights_type: str
    allowed_channels: Optional[List[str]] = []
    active: bool = True
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    metadata: Optional[dict] = None


class RevenueRulePayload(BaseModel):
    rule_id: str
    operator_type: str
    inventory_type: str
    operator_fee_pct: float
    inventory_owner_pct: float
    platform_fee_pct: float
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    metadata: Optional[dict] = None


def _passes_rights_gate(req_operator_id: str, unit: DecisionUnitPayload, access_map: Dict[str, dict], now_utc: datetime) -> bool:
    if not unit.inventory_id:
        return False
    acc = access_map.get(unit.inventory_id)
    if not acc:
        return False
    if not acc.get("active", False):
        return False

    eff_from = acc.get("effective_from")
    eff_to = acc.get("effective_to")
    if eff_from:
        eff_from_dt = eff_from.replace(tzinfo=timezone.utc) if eff_from.tzinfo is None else eff_from
        if now_utc < eff_from_dt:
            return False
    if eff_to:
        eff_to_dt = eff_to.replace(tzinfo=timezone.utc) if eff_to.tzinfo is None else eff_to
        if now_utc > eff_to_dt:
            return False

    allowed = acc.get("allowed_channels") or []
    if allowed and unit.channel not in allowed:
        return False

    if not unit.format_compatible:
        return False
    if not unit.category_allowed:
        return False

    # Ensure operator requested in optimize matches access scope.
    if req_operator_id and req_operator_id != unit.operator_id:
        return False

    return True


@app.on_event("startup")
def startup_seed():
    create_tenant("club_demo", "CLUB_A", {"type": "club", "sport": "football", "geo": "AU"})
    create_tenant("brand_demo", "BRAND_A", {"type": "brand", "geo": "AU"})
    create_tenant("broadcaster_demo", "BROADCASTER_A", {"type": "broadcaster", "geo": "AU"})

    create_segment("seg_hardcore", "club_demo", "Hardcore Fans", {"rule": "rfm_score > 7"})
    create_segment("seg_casual", "club_demo", "Casual Fans", {"rule": "rfm_score <= 7"})
    create_creative("cr_upbeat", "club_demo", "Upbeat Match Creative", {"tone": "upbeat", "moment_fit": "team_success"})
    create_creative("cr_consoling", "club_demo", "Consoling Match Creative", {"tone": "consoling", "moment_fit": "team_failure"})
    create_offer("off_merch", "club_demo", "Merch 15% Off", {"type": "merch", "code": "M15"})

    create_campaign("camp_1", "brand_demo", "meta", "Brand Moment Burst", "conversions", "active", {"budget": 100000, "property": "club_demo"})

    upsert_integration("club_demo", "cdp", {"provider": "Segment", "write_key": "demo"})
    upsert_integration("brand_demo", "ad_accounts", {"meta_account_id": "meta_demo", "google_ads_id": "google_demo"})

    upsert_inventory_access(
        "broadcaster_demo",
        "inv_gam_home",
        "club_demo",
        "gam",
        "licensed",
        ["inapp", "meta", "google", "youtube", "dsp", "ott", "gam", "ssp"],
        True,
        None,
        None,
        {"placement_group": "home_feed"},
    )
    upsert_inventory_access(
        "club_demo",
        "inv_owned_app",
        "club_demo",
        "owned",
        "owned",
        ["inapp"],
        True,
        None,
        None,
        {"placement_group": "app_slots"},
    )

    create_revenue_rule("rule_broadcaster_gam", "broadcaster", "gam", 0.15, 0.75, 0.10, None, None, {"contract": "default"})
    create_revenue_rule("rule_club_owned", "club", "owned", 1.0, 0.0, 0.0, None, None, {"contract": "default"})


@app.get("/health")
def health():
    return {"ok": True, "version": APP_VERSION}


@app.post("/optimize")
def optimize(req: OptimizeRequest):
    now_utc = datetime.now(timezone.utc)
    req_operator_id = (req.operator_id or "").strip()

    access_map = {}
    inventory_ids = [u.inventory_id for u in req.units if u.inventory_id]
    if req_operator_id and inventory_ids:
        access_map = get_inventory_access_map(req_operator_id, list(set(inventory_ids)))

    units: List[DecisionUnit] = []
    keys: List[str] = []
    skipped = 0
    for u in req.units:
        if req_operator_id:
            if not _passes_rights_gate(req_operator_id, u, access_map, now_utc):
                skipped += 1
                continue
        du = DecisionUnit(**u.dict())
        units.append(du)
        keys.append(make_key(u.channel, u.campaign_id, u.segment_id, u.moment, u.creative_id, u.offer_id, u.inventory_id))

    if not units:
        return {
            "run_id": str(uuid.uuid4()),
            "allocations": {},
            "channel_spend": {},
            "campaign_spend": {},
            "debug": {"scores": {}, "base_ev": {}, "moment_mult": {}},
            "timestamp": int(now_utc.timestamp()),
            "skipped_by_eligibility": skipped,
        }

    bandit_state_in = load_policy_state(keys)

    signals: Dict[DecisionUnit, UnitSignals] = {}
    if req.signals:
        for u in units:
            k = make_key(u.channel, u.campaign_id, u.segment_id, u.moment, u.creative_id, u.offer_id, u.inventory_id)
            sig = req.signals[k]
            signals[u] = UnitSignals(**sig.dict())
    else:
        preds = latest_model_predictions(keys)
        for u in units:
            k = make_key(u.channel, u.campaign_id, u.segment_id, u.moment, u.creative_id, u.offer_id, u.inventory_id)
            p = preds.get(k)
            if not p:
                signals[u] = UnitSignals(
                    p_action=0.01,
                    ltv_uplift=200.0,
                    margin_rate=0.40,
                    expected_cost_per_action=50.0,
                    max_spend=500.0,
                    fatigue_score=0.0,
                )
            else:
                signals[u] = UnitSignals(
                    p_action=float(p["p_action"]),
                    ltv_uplift=float(p["ltv_uplift"]),
                    margin_rate=float(p["margin_rate"]),
                    expected_cost_per_action=float(p["expected_cpa"]),
                    incrementality=float(p["incrementality"]),
                    max_spend=500.0,
                    fatigue_score=0.0,
                )

    prev = {}
    if req.previous_allocations:
        key_to_du = {
            make_key(d.channel, d.campaign_id, d.segment_id, d.moment, d.creative_id, d.offer_id, d.inventory_id): d
            for d in units
        }
        for k, amt in req.previous_allocations.items():
            du = key_to_du.get(k)
            if du:
                prev[du] = float(amt)

    max_realloc = 0.55 if req.moment_spike_active else 0.35
    constraints = Constraints(
        total_budget=req.total_budget,
        exploration_ratio=req.exploration_ratio,
        channel_min=req.channel_min or {},
        channel_max=req.channel_max or {},
        campaign_min=req.campaign_min or {},
        campaign_max=req.campaign_max or {},
        max_realloc_per_tick_ratio=max_realloc,
    )

    result = allocate_budget(
        units=units,
        signals=signals,
        constraints=constraints,
        moment_multipliers=req.moment_multipliers or {},
        previous_allocations=prev,
        bandit_state_in=bandit_state_in,
        seed=7,
    )

    upsert_policy_state(result.bandit_state)

    run_id = uuid.uuid4()
    records = []
    for du, amt in result.allocations.items():
        k = make_key(du.channel, du.campaign_id, du.segment_id, du.moment, du.creative_id, du.offer_id, du.inventory_id)
        records.append(
            {
                "key": k,
                "operator_id": du.operator_id,
                "inventory_owner_id": du.inventory_owner_id,
                "inventory_id": du.inventory_id,
                "inventory_type": du.inventory_type,
                "rights_type": du.rights_type,
                "campaign_id": du.campaign_id,
                "channel": du.channel,
                "placement_ref": du.placement_ref,
                "allocated_budget": float(amt),
                "score": float(result.score_map[du]),
                "base_ev": float(result.base_ev_map[du]),
                "moment_multiplier": float(result.moment_mult_map[du]),
            }
        )
    log_allocations(run_id, records)

    allocations_out = {
        make_key(d.channel, d.campaign_id, d.segment_id, d.moment, d.creative_id, d.offer_id, d.inventory_id): float(a)
        for d, a in result.allocations.items()
    }

    return {
        "run_id": str(run_id),
        "allocations": allocations_out,
        "channel_spend": result.channel_spend,
        "campaign_spend": result.campaign_spend,
        "debug": {
            "scores": {
                make_key(d.channel, d.campaign_id, d.segment_id, d.moment, d.creative_id, d.offer_id, d.inventory_id): float(s)
                for d, s in result.score_map.items()
            },
            "base_ev": {
                make_key(d.channel, d.campaign_id, d.segment_id, d.moment, d.creative_id, d.offer_id, d.inventory_id): float(s)
                for d, s in result.base_ev_map.items()
            },
            "moment_mult": {
                make_key(d.channel, d.campaign_id, d.segment_id, d.moment, d.creative_id, d.offer_id, d.inventory_id): float(s)
                for d, s in result.moment_mult_map.items()
            },
        },
        "timestamp": result.created_at_unix,
        "skipped_by_eligibility": skipped,
    }


@app.post("/update")
def update(req: UpdateRequest):
    keys = [o.key for o in req.outcomes if o.key]
    state = load_policy_state(keys)

    bandit = ThompsonBandit(seed=7)
    bandit.import_state(state)

    rows = []
    for o in req.outcomes:
        if o.spend <= 0:
            continue
        realized_ev = o.realized_profit / o.spend
        success = realized_ev >= (o.predicted_ev * 1.05)
        bandit.update(o.key, success=success, weight=max(0.25, float(o.weight)))
        rows.append(
            {
                "run_id": o.run_id,
                "key": o.key,
                "operator_id": o.operator_id,
                "inventory_owner_id": o.inventory_owner_id,
                "inventory_id": o.inventory_id,
                "inventory_type": o.inventory_type,
                "rights_type": o.rights_type,
                "campaign_id": o.campaign_id,
                "channel": o.channel,
                "placement_ref": o.placement_ref,
                "spend": float(o.spend),
                "impressions": int(o.impressions),
                "conversions": int(o.conversions),
                "realized_profit": float(o.realized_profit),
                "predicted_ev": float(o.predicted_ev),
            }
        )

    upsert_policy_state(bandit.export_state())
    log_outcomes(None, rows)

    return {"updated": len(rows)}


@app.get("/admin/tenants")
def admin_list_tenants(x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_tenants()}


@app.post("/admin/tenants")
def admin_create_tenant(payload: TenantPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_tenant(payload.tenant_id, payload.name, payload.metadata)


@app.post("/admin/campaigns")
def admin_create_campaign(payload: CampaignPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_campaign(payload.campaign_id, payload.tenant_id, payload.channel, payload.name, payload.objective, payload.status, payload.metadata)


@app.get("/admin/campaigns")
def admin_list_campaigns(tenant_id: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_campaigns(tenant_id=tenant_id)}


@app.post("/admin/segments")
def admin_create_segment(payload: SegmentPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_segment(payload.segment_id, payload.tenant_id, payload.name, payload.definition)


@app.get("/admin/segments")
def admin_list_segments(tenant_id: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_segments(tenant_id=tenant_id)}


@app.post("/admin/creatives")
def admin_create_creative(payload: CreativePayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_creative(payload.creative_id, payload.tenant_id, payload.name, payload.metadata)


@app.get("/admin/creatives")
def admin_list_creatives(tenant_id: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_creatives(tenant_id=tenant_id)}


@app.post("/admin/offers")
def admin_create_offer(payload: OfferPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_offer(payload.offer_id, payload.tenant_id, payload.name, payload.metadata)


@app.get("/admin/offers")
def admin_list_offers(tenant_id: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_offers(tenant_id=tenant_id)}


@app.post("/admin/integrations")
def admin_upsert_integration(payload: IntegrationPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return upsert_integration(payload.tenant_id, payload.kind, payload.config)


@app.get("/admin/integrations")
def admin_list_integrations(tenant_id: str, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_integrations(tenant_id)}


@app.post("/admin/inventory-access")
def admin_upsert_inventory_access(payload: InventoryAccessPayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return upsert_inventory_access(
        payload.operator_id,
        payload.inventory_id,
        payload.inventory_owner_id,
        payload.inventory_type,
        payload.rights_type,
        payload.allowed_channels,
        payload.active,
        payload.effective_from,
        payload.effective_to,
        payload.metadata,
    )


@app.get("/admin/inventory-access")
def admin_list_inventory_access(operator_id: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_inventory_access(operator_id)}


@app.post("/admin/revenue-rules")
def admin_create_revenue_rule(payload: RevenueRulePayload, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return create_revenue_rule(
        payload.rule_id,
        payload.operator_type,
        payload.inventory_type,
        payload.operator_fee_pct,
        payload.inventory_owner_pct,
        payload.platform_fee_pct,
        payload.effective_from,
        payload.effective_to,
        payload.metadata,
    )


@app.get("/admin/revenue-rules")
def admin_list_revenue_rules(x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_revenue_rules()}


@app.post("/admin/settlement/run")
def admin_run_settlement(settlement_date: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    date_to_run = settlement_date or datetime.now(timezone.utc).date().isoformat()
    run_shadow_settlement(date_to_run)
    return {"status": "ok", "settlement_date": date_to_run}


@app.get("/admin/settlement/summary")
def admin_settlement_summary(settlement_date: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    date_to_run = settlement_date or datetime.now(timezone.utc).date().isoformat()
    return {"items": settlement_summary(date_to_run)}


@app.get("/admin/settlement/export", response_class=PlainTextResponse)
def admin_settlement_export_csv(settlement_date: Optional[str] = None, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    date_to_run = settlement_date or datetime.now(timezone.utc).date().isoformat()
    rows = settlement_summary(date_to_run)
    header = "settlement_date,operator_id,inventory_owner_id,inventory_id,channel,gross_spend,impressions,conversions,operator_share,owner_share,platform_share,rule_id"
    lines = [header]
    for r in rows:
        lines.append(
            f"{r['settlement_date']},{r['operator_id']},{r['inventory_owner_id']},{r['inventory_id']},{r['channel']},{r['gross_spend']},{r['impressions']},{r['conversions']},{r['operator_share']},{r['owner_share']},{r['platform_share']},{r['rule_id'] or ''}"
        )
    return "\n".join(lines)


@app.get("/admin/runs")
def admin_runs(limit: int = 10, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_runs(limit=limit)}


@app.get("/admin/allocations/{run_id}")
def admin_allocations(run_id: str, limit: int = 200, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": allocations_for_run(run_id, limit=limit)}


@app.get("/admin/policy_state")
def admin_policy_state(limit: int = 25, x_admin_token: Optional[str] = Header(default=None)):
    require_admin(x_admin_token)
    return {"items": list_policy_state(limit=limit)}
