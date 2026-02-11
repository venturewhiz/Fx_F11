import express from "express";
import { v4 as uuid } from "uuid";

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || "http://optimizer:8000/optimize";

const app = express();
app.use(express.json());

// In-memory event bus (MVP). Replace with Kafka/PubSub.
const subscribers = {};
function subscribe(topic, fn) {
  subscribers[topic] = subscribers[topic] || [];
  subscribers[topic].push(fn);
}
function publish(topic, event) {
  (subscribers[topic] || []).forEach((fn) => fn(event));
}

async function callOptimizer(payload) {
  const r = await fetch(OPTIMIZER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Optimizer error: ${r.status} ${await r.text()}`);
  return r.json();
}

function toArrayAllocations(optOut) {
  const rows = [];
  const alloc = optOut?.allocations || {};
  const baseEv = optOut?.debug?.base_ev || {};
  Object.entries(alloc).forEach(([key, allocated_budget]) => {
    const [channel, campaign_id, segment_id, moment, creative_id, offer_id, inventory_id] = key.split("|");
    rows.push({
      channel,
      campaign_id,
      segment_id,
      moment,
      creative_id,
      offer_id,
      inventory_id: inventory_id || "",
      allocated_budget: Number(allocated_budget || 0),
      ev: Number(baseEv[key] || 0),
      expected_roas: Number(baseEv[key] || 0),
      expected_acos: 0,
    });
  });
  rows.sort((a, b) => b.allocated_budget - a.allocated_budget);
  return rows;
}

// Demo generator (replace with warehouse/CDP + creative library)
function demoOptimizeInput(momentPayload) {
  const units = [];
  const signals = {};
  const campaigns = ["camp_1"];
  const channels = ["meta", "dsp", "inapp"];
  const segments = ["seg_hardcore", "seg_casual"];
  const momentName = momentPayload?.moment?.type || "team_success";

  for (const ch of channels) {
    for (const seg of segments) {
      for (const cr of ["cr_upbeat", "cr_consoling"]) {
        const inventoryId = ch === "inapp" ? "inv_owned_app" : "inv_gam_home";
        const inventoryType = ch === "inapp" ? "owned" : "gam";
        const rightsType = ch === "inapp" ? "owned" : "licensed";
        const u = {
          channel: ch,
          campaign_id: campaigns[0],
          segment_id: seg,
          moment: momentName,
          creative_id: cr,
          offer_id: "off_merch",
          inventory_id: inventoryId,
          inventory_type: inventoryType,
          operator_id: "broadcaster_demo",
          inventory_owner_id: "club_demo",
          rights_type: rightsType,
          placement_ref: ch === "inapp" ? "slot_home_hero" : "gam_home_1",
          format_compatible: true,
          category_allowed: true,
        };
        units.push(u);
        const key = `${u.channel}|${u.campaign_id}|${u.segment_id}|${u.moment}|${u.creative_id}|${u.offer_id}|${u.inventory_id}`;

        const p_action = seg === "seg_hardcore" ? 0.08 : 0.04;
        const expected_cost_per_action = ch === "inapp" ? 20.0 : ch === "meta" ? 45.0 : 55.0;
        signals[key] = {
          p_action,
          ltv_uplift: seg === "seg_hardcore" ? 2200.0 : 1200.0,
          margin_rate: 0.35,
          expected_cost_per_action,
          max_spend: 30000,
          fatigue_score: cr === "cr_upbeat" ? 0.2 : 0.1,
          freq_cap_ok: true,
          brand_safe: true,
          eligible: true,
          incrementality: 1.0,
        };
      }
    }
  }

  const moment_multipliers = { [momentName]: momentName === "team_success" ? 1.6 : 1.2 };

  return {
    total_budget: 100000,
    exploration_ratio: 0.08,
    units,
    signals,
    operator_id: "broadcaster_demo",
    channel_min: { inapp: 10000 },
    channel_max: { dsp: 45000 },
    campaign_min: {},
    campaign_max: {},
    moment_multipliers,
    previous_allocations: {},
    moment_spike_active: ["team_success", "turning_point"].includes(momentName),
  };
}

subscribe("moment.detected", async (evt) => {
  try {
    const optimizeInput = demoOptimizeInput(evt.payload);
    const out = await callOptimizer(optimizeInput);

    const allocations = toArrayAllocations(out);
    const allocEvt = {
      event_id: uuid(),
      event_type: "optimizer.allocation_ready",
      tenant_id: evt.tenant_id || "club_demo",
      timestamp_utc: new Date().toISOString(),
      source: "orchestrator",
      version: "1.0",
      payload: allocations,
      run_id: out.run_id,
    };

    const bidsEvt = {
      event_id: uuid(),
      event_type: "bidder.bids_ready",
      tenant_id: evt.tenant_id || "club_demo",
      timestamp_utc: new Date().toISOString(),
      source: "orchestrator",
      version: "1.0",
      payload: [],
      run_id: out.run_id,
    };

    lastAlloc = allocEvt;
    lastBids = bidsEvt;
    publish("optimizer.allocation_ready", allocEvt);
    publish("bidder.bids_ready", bidsEvt);
    console.log("Published:", allocations.length, "allocations");
  } catch (e) {
    console.error("moment handler failed:", e);
  }
});

app.post("/events/:topic", (req, res) => {
  publish(req.params.topic, req.body);
  res.json({ status: "ok" });
});

let lastAlloc = null;
let lastBids = null;
app.get("/latest/allocation", (_req, res) => res.json(lastAlloc || {}));
app.get("/latest/bids", (_req, res) => res.json(lastBids || {}));

app.listen(8090, () => console.log("orchestrator on :8090"));
