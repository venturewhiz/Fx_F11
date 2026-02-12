from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
import time
import random

from bandit import ThompsonBandit
from keys import make_key

@dataclass(frozen=True)
class DecisionUnit:
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

@dataclass
class UnitSignals:
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

@dataclass
class Constraints:
    total_budget: float
    exploration_ratio: float = 0.08
    channel_min: Dict[str, float] = None
    channel_max: Dict[str, float] = None
    campaign_min: Dict[str, float] = None
    campaign_max: Dict[str, float] = None
    max_realloc_per_tick_ratio: float = 0.35

    def __post_init__(self):
        self.channel_min = self.channel_min or {}
        self.channel_max = self.channel_max or {}
        self.campaign_min = self.campaign_min or {}
        self.campaign_max = self.campaign_max or {}

@dataclass
class AllocationResult:
    allocations: Dict[DecisionUnit, float]
    channel_spend: Dict[str, float]
    campaign_spend: Dict[str, float]
    score_map: Dict[DecisionUnit, float]
    base_ev_map: Dict[DecisionUnit, float]
    moment_mult_map: Dict[DecisionUnit, float]
    bandit_state: Dict[str, tuple]
    created_at_unix: int

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def unit_base_ev_per_rupee(s: UnitSignals, moment_multiplier: float, fatigue_strength: float = 0.6) -> float:
    """Predictive EV/₹ (profit per rupee) with fatigue and moment weighting."""
    if not (s.eligible and s.brand_safe and s.freq_cap_ok):
        return -1e9

    p = clamp(s.p_action, 0.0, 1.0)
    inc = clamp(s.incrementality, 0.0, 2.0)
    cpa = max(1e-6, s.expected_cost_per_action)

    expected_profit = s.ltv_uplift * p * s.margin_rate * inc
    base_ev = expected_profit / cpa

    fatigue = clamp(s.fatigue_score, 0.0, 1.0)
    penalty = clamp(1.0 - fatigue_strength * fatigue, 0.05, 1.0)

    return base_ev * penalty * max(0.0, moment_multiplier)

def allocate_budget(
    units: List[DecisionUnit],
    signals: Dict[DecisionUnit, UnitSignals],
    constraints: Constraints,
    moment_multipliers: Optional[Dict[str, float]] = None,
    previous_allocations: Optional[Dict[DecisionUnit, float]] = None,
    bandit_state_in: Optional[Dict[str, tuple]] = None,
    seed: int = 7,
) -> AllocationResult:
    """Constrained allocator: base EV (predictive) * bandit multiplier, with exploration + stability."""
    random.seed(seed)
    moment_multipliers = moment_multipliers or {}
    previous_allocations = previous_allocations or {}

    bandit = ThompsonBandit(seed=seed)
    if bandit_state_in:
        bandit.import_state(bandit_state_in)

    score_map: Dict[DecisionUnit, float] = {}
    base_ev_map: Dict[DecisionUnit, float] = {}
    moment_mult_map: Dict[DecisionUnit, float] = {}
    eligible: List[DecisionUnit] = []

    for u in units:
        mm = moment_multipliers.get(u.moment, 1.0)
        s = signals[u]
        base = unit_base_ev_per_rupee(s, mm)
        base_ev_map[u] = base
        moment_mult_map[u] = mm

        if base > -1e8 and s.max_spend > 0:
            key = make_key(u.channel, u.campaign_id, u.segment_id, u.moment, u.creative_id, u.offer_id, u.inventory_id)
            mult = bandit.sample_multiplier(key)
            score_map[u] = base * mult
            eligible.append(u)
        else:
            score_map[u] = base

    total = float(constraints.total_budget)
    exp_budget = total * clamp(constraints.exploration_ratio, 0.0, 0.5)

    alloc: Dict[DecisionUnit, float] = {u: 0.0 for u in units}
    channel_spend: Dict[str, float] = {}
    campaign_spend: Dict[str, float] = {}

    def can_add(u: DecisionUnit, delta: float) -> bool:
        ch_max = constraints.channel_max.get(u.channel, float("inf"))
        cp_max = constraints.campaign_max.get(u.campaign_id, float("inf"))
        if channel_spend.get(u.channel, 0.0) + delta > ch_max + 1e-9:
            return False
        if campaign_spend.get(u.campaign_id, 0.0) + delta > cp_max + 1e-9:
            return False
        return True

    def add(u: DecisionUnit, amt: float) -> float:
        if amt <= 0:
            return 0.0
        s = signals[u]
        cap = max(0.0, s.max_spend - alloc[u])
        x = min(amt, cap)
        if x <= 0:
            return 0.0
        alloc[u] += x
        channel_spend[u.channel] = channel_spend.get(u.channel, 0.0) + x
        campaign_spend[u.campaign_id] = campaign_spend.get(u.campaign_id, 0.0) + x
        return x

    remaining = total

    # 1) meet channel mins
    for ch, mn in constraints.channel_min.items():
        need = max(0.0, float(mn) - channel_spend.get(ch, 0.0))
        if need <= 0:
            continue
        ranked = sorted([u for u in eligible if u.channel == ch], key=lambda x: score_map[x], reverse=True)
        for u in ranked:
            if remaining <= 0 or need <= 0:
                break
            step = min(need, remaining, signals[u].max_spend - alloc[u])
            if step > 0 and can_add(u, step):
                spent = add(u, step)
                need -= spent
                remaining -= spent

    # 2) meet campaign mins
    for cp, mn in constraints.campaign_min.items():
        need = max(0.0, float(mn) - campaign_spend.get(cp, 0.0))
        if need <= 0:
            continue
        ranked = sorted([u for u in eligible if u.campaign_id == cp], key=lambda x: score_map[x], reverse=True)
        for u in ranked:
            if remaining <= 0 or need <= 0:
                break
            step = min(need, remaining, signals[u].max_spend - alloc[u])
            if step > 0 and can_add(u, step):
                spent = add(u, step)
                need -= spent
                remaining -= spent

    # 3) exploration: spread across top 40% eligible to learn safely
    if eligible and remaining > 0 and exp_budget > 0:
        ranked = sorted(eligible, key=lambda x: score_map[x], reverse=True)
        pool = ranked[: max(5, int(0.4 * len(ranked)))]
        per = min(exp_budget, remaining) / len(pool)
        for u in pool:
            if remaining <= 0:
                break
            step = min(per, remaining, signals[u].max_spend - alloc[u])
            if step > 0 and can_add(u, step):
                spent = add(u, step)
                remaining -= spent

    # 4) exploitation: best-first
    ranked_all = sorted(eligible, key=lambda x: score_map[x], reverse=True)
    for u in ranked_all:
        if remaining <= 0:
            break
        if score_map[u] <= 0:
            continue
        room = signals[u].max_spend - alloc[u]
        if room <= 0:
            continue
        ch_room = constraints.channel_max.get(u.channel, float("inf")) - channel_spend.get(u.channel, 0.0)
        cp_room = constraints.campaign_max.get(u.campaign_id, float("inf")) - campaign_spend.get(u.campaign_id, 0.0)
        step = min(remaining, room, ch_room, cp_room)
        if step > 0 and can_add(u, step):
            spent = add(u, step)
            remaining -= spent

    # 5) stability: limit per-tick reallocation magnitude
    if previous_allocations:
        max_change = total * clamp(constraints.max_realloc_per_tick_ratio, 0.0, 1.0)
        abs_change = sum(abs(alloc.get(u, 0.0) - previous_allocations.get(u, 0.0)) for u in units)
        if abs_change > max_change and abs_change > 1e-9:
            ratio = max_change / abs_change
            for u in units:
                prev = previous_allocations.get(u, 0.0)
                alloc[u] = prev + (alloc[u] - prev) * ratio

            # recompute spends
            channel_spend, campaign_spend = {}, {}
            for u, amt in alloc.items():
                if amt <= 0:
                    continue
                channel_spend[u.channel] = channel_spend.get(u.channel, 0.0) + amt
                campaign_spend[u.campaign_id] = campaign_spend.get(u.campaign_id, 0.0) + amt

    return AllocationResult(
        allocations=alloc,
        channel_spend=channel_spend,
        campaign_spend=campaign_spend,
        score_map=score_map,
        base_ev_map=base_ev_map,
        moment_mult_map=moment_mult_map,
        bandit_state=bandit.export_state(),
        created_at_unix=int(time.time()),
    )
