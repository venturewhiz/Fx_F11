import express from "express";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const OPTIMIZER_ADMIN_URL = process.env.OPTIMIZER_ADMIN_URL || "http://optimizer:8000/admin";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function actorScope(req) {
  const actorType = (req.headers["x-actor-type"] || "anonymous").toString().trim();
  const actorTenantId = (req.headers["x-actor-tenant-id"] || "").toString().trim();
  const actorClubTenantId = (req.headers["x-club-tenant-id"] || "").toString().trim();
  return { actorType, actorTenantId, actorClubTenantId };
}

function requireTenantScope(req, tenantId) {
  const { actorType, actorTenantId } = actorScope(req);
  if (!tenantId) return { ok: false, code: 400, error: "missing_tenant_id" };
  if (actorType === "platform" || actorType === "operator") return { ok: true };

  if (!actorTenantId) return { ok: false, code: 401, error: "missing_actor_tenant_id" };
  if (actorTenantId !== tenantId) return { ok: false, code: 403, error: "tenant_scope_forbidden" };
  return { ok: true };
}


function adminHeaders() {
  const h = { "content-type": "application/json" };
  if (ADMIN_TOKEN) h["x-admin-token"] = ADMIN_TOKEN;
  return h;
}

async function adminGet(path, query = "") {
  const r = await fetch(`${OPTIMIZER_ADMIN_URL}${path}${query}`, { headers: adminHeaders() });
  if (!r.ok) throw new Error(`admin_get_failed:${r.status}`);
  return r.json();
}

async function adminPost(path, body) {
  const r = await fetch(`${OPTIMIZER_ADMIN_URL}${path}`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`admin_post_failed:${r.status}`);
  return r.json();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/tenants/club/register", async (req, res) => {
  try {
    const tenant_id = `club_${uuid().slice(0, 8)}`;
    const payload = {
      tenant_id,
      name: req.body?.name || req.body?.club_name || tenant_id,
      metadata: { type: "club", ...req.body },
    };
    const out = await adminPost("/tenants", payload);
    res.json({ tenant_id: out.tenant_id });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/brand/register", async (req, res) => {
  try {
    const club_tenant_id = (req.body?.club_tenant_id || req.body?.club_id || "").trim();
    if (!club_tenant_id) return res.status(400).json({ error: "missing_club_tenant_id" });

    const tenants = await adminGet("/tenants");
    const club = (tenants?.items || []).find((x) => x.tenant_id === club_tenant_id);
    if (!club || (club.metadata?.type !== "club")) {
      return res.status(400).json({ error: "invalid_club_tenant_id" });
    }

    const tenant_id = `brand_${uuid().slice(0, 8)}`;
    const payload = {
      tenant_id,
      name: req.body?.name || req.body?.brand_name || tenant_id,
      metadata: { type: "brand", club_tenant_id, ...(req.body || {}) },
    };
    const out = await adminPost("/tenants", payload);
    res.json({ tenant_id: out.tenant_id, club_tenant_id });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants", async (_req, res) => {
  try {
    const out = await adminGet("/tenants");
    const items = out?.items || [];
    const integrationsByTenant = {};
    await Promise.all(items.map(async (t) => {
      try {
        const x = await adminGet("/integrations", `?tenant_id=${encodeURIComponent(t.tenant_id)}`);
        integrationsByTenant[t.tenant_id] = (x?.items || []).reduce((m, r) => {
          m[r.kind] = r.config || {};
          return m;
        }, {});
      } catch {
        integrationsByTenant[t.tenant_id] = {};
      }
    }));

    const normalized = items.map((t) => ({
      ...t,
      type: t.metadata?.type || "unknown",
      integrations: integrationsByTenant[t.tenant_id] || {},
    }));
    res.json(normalized);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/config", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const tenants = await adminGet("/tenants");
    const found = (tenants?.items || []).find((x) => x.tenant_id === req.params.tenant_id);
    if (!found) return res.status(404).json({ error: "tenant_not_found" });
    const ints = await adminGet("/integrations", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json({ ...found, type: found.metadata?.type || "unknown", integrations: ints?.items || [] });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/integrations", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const { kind, config } = req.body || {};
    if (!kind) return res.status(400).json({ error: "missing_kind" });
    await adminPost("/integrations", { tenant_id: req.params.tenant_id, kind, config: config || {} });
    res.json({ status: "connected", kind });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/integrations", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const out = await adminGet("/integrations", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    const obj = (out?.items || []).reduce((m, r) => {
      m[r.kind] = r.config || {};
      return m;
    }, {});
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/campaigns", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const payload = {
      campaign_id: req.body?.campaign_id || `camp_${uuid().slice(0, 8)}`,
      tenant_id: req.params.tenant_id,
      channel: req.body?.channel || "meta",
      name: req.body?.name || "Campaign",
      objective: req.body?.objective || null,
      status: req.body?.status || "active",
      metadata: req.body || {},
    };
    const out = await adminPost("/campaigns", payload);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/campaigns", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const out = await adminGet("/campaigns", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json(out?.items || []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/segments", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const payload = {
      segment_id: req.body?.segment_id || `seg_${uuid().slice(0, 8)}`,
      tenant_id: req.params.tenant_id,
      name: req.body?.name || "Segment",
      definition: { rule: req.body?.rule || "all", ...req.body },
    };
    const out = await adminPost("/segments", payload);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/segments", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const out = await adminGet("/segments", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, rule: x.definition?.rule || "" })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/creatives", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const payload = {
      creative_id: req.body?.creative_id || `cr_${uuid().slice(0, 8)}`,
      tenant_id: req.params.tenant_id,
      name: req.body?.name || "Creative",
      metadata: req.body || {},
    };
    const out = await adminPost("/creatives", payload);
    res.json({ ...out, ...(out.metadata || {}) });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/creatives", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const out = await adminGet("/creatives", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, ...(x.metadata || {}) })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/offers", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const payload = {
      offer_id: req.body?.offer_id || `off_${uuid().slice(0, 8)}`,
      tenant_id: req.params.tenant_id,
      name: req.body?.name || "Offer",
      metadata: req.body || {},
    };
    const out = await adminPost("/offers", payload);
    res.json({ ...out, ...(out.metadata || {}) });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/tenants/:tenant_id/offers", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const out = await adminGet("/offers", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, ...(x.metadata || {}) })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/marketplace/inventory", async (req, res) => {
  try {
    const [out, rights] = await Promise.all([
      adminGet("/tenants"),
      adminGet("/inventory-access"),
    ]);
    const tenants = out?.items || [];
    const tenantById = tenants.reduce((m, t) => {
      m[t.tenant_id] = t;
      return m;
    }, {});
    const { actorType, actorTenantId, actorClubTenantId } = actorScope(req);
    if (actorType === "brand" && !actorClubTenantId) {
      return res.status(400).json({ error: "missing_x_club_tenant_id" });
    }

    const scopedRights = (rights?.items || []).filter((r) => {
      if (actorType === "platform" || actorType === "operator" || actorType === "anonymous") return true;
      if (actorType === "club") return r.inventory_owner_id === actorTenantId;
      if (actorType === "brand") return r.inventory_owner_id === actorClubTenantId;
      return false;
    });

    const items = scopedRights.map((r) => ({
      operator_id: r.operator_id,
      operator_name: tenantById[r.operator_id]?.name || r.operator_id,
      club_tenant_id: r.inventory_owner_id,
      club_name: tenantById[r.inventory_owner_id]?.name || r.inventory_owner_id,
      sport: tenantById[r.inventory_owner_id]?.metadata?.sport || "football",
      geo: tenantById[r.inventory_owner_id]?.metadata?.geo || "global",
      brand_safety_rating: tenantById[r.inventory_owner_id]?.metadata?.brand_safety_rating || "A",
      inventory_id: r.inventory_id,
      rights_type: r.rights_type,
      inventory: [
        { format: r.inventory_type, channels: r.allowed_channels || [], moment_targeting: true },
      ],
    }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/rights/inventory-access", async (req, res) => {
  try {
    const out = await adminPost("/inventory-access", req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/rights/inventory-access", async (req, res) => {
  try {
    const query = req.query?.operator_id ? `?operator_id=${encodeURIComponent(req.query.operator_id)}` : "";
    const out = await adminGet("/inventory-access", query);
    res.json(out?.items || []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/finance/revenue-rules", async (req, res) => {
  try {
    const out = await adminPost("/revenue-rules", req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/finance/revenue-rules", async (_req, res) => {
  try {
    const out = await adminGet("/revenue-rules");
    res.json(out?.items || []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/finance/settlement/run", async (req, res) => {
  try {
    const { actorType, actorTenantId } = actorScope(req);
    if (!(actorType === "platform" || actorType === "operator" || actorType === "club")) {
      return res.status(403).json({ error: "settlement_scope_forbidden" });
    }
    const date = req.body?.settlement_date;
    const query = date ? `?settlement_date=${encodeURIComponent(date)}` : "";
    const out = await fetch(`${OPTIMIZER_ADMIN_URL}/settlement/run${query}`, {
      method: "POST",
      headers: adminHeaders(),
    }).then((r) => r.json());
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/finance/settlement/summary", async (req, res) => {
  try {
    const { actorType, actorTenantId } = actorScope(req);
    if (!(actorType === "platform" || actorType === "operator" || actorType === "club")) {
      return res.status(403).json({ error: "settlement_scope_forbidden" });
    }
    const date = req.query?.settlement_date;
    const query = date ? `?settlement_date=${encodeURIComponent(date)}` : "";
    const out = await adminGet("/settlement/summary", query);
    res.json(out?.items || []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/finance/settlement/export", async (req, res) => {
  try {
    const { actorType, actorTenantId } = actorScope(req);
    if (!(actorType === "platform" || actorType === "operator" || actorType === "club")) {
      return res.status(403).json({ error: "settlement_scope_forbidden" });
    }
    const date = req.query?.settlement_date;
    const query = date ? `?settlement_date=${encodeURIComponent(date)}` : "";
    const r = await fetch(`${OPTIMIZER_ADMIN_URL}/settlement/export${query}`, { headers: adminHeaders() });
    const csv = await r.text();
    if (!r.ok) throw new Error(csv || `settlement_export_failed:${r.status}`);
    res.setHeader("content-type", "text/csv");
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(8080, () => console.log("api-gateway on :8080"));


const INTEGRATION_CATALOG = [
  { plugin_id: "fanatics_commerce", kind: "ecommerce", provider: "fanatics", label: "Fanatics Commerce", capabilities: ["extract_products", "sync_catalog", "offers"], endpoint_env: "FANATICS_BASE_URL" },
  { plugin_id: "amazon_commerce", kind: "ecommerce", provider: "amazon", label: "Amazon Commerce", capabilities: ["extract_products", "sync_catalog"], endpoint_env: "AMAZON_BASE_URL" },
  { plugin_id: "shopify_commerce", kind: "ecommerce", provider: "shopify", label: "Shopify Commerce", capabilities: ["extract_products", "sync_catalog", "offers"], endpoint_env: "SHOPIFY_BASE_URL" },
  { plugin_id: "fanatics_ads", kind: "dsp", provider: "fanatics_ads", label: "Fanatics Ads", capabilities: ["activate_campaign", "optimize_bids"], endpoint_env: "FANATICS_ADS_BASE_URL" },
  { plugin_id: "amazon_ads", kind: "dsp", provider: "amazon_ads", label: "Amazon Ads", capabilities: ["activate_campaign", "optimize_bids"], endpoint_env: "AMAZON_ADS_BASE_URL" },
  { plugin_id: "thetradedesk", kind: "dsp", provider: "thetradedesk", label: "The Trade Desk", capabilities: ["activate_campaign", "optimize_bids", "audience_sync"], endpoint_env: "TTD_BASE_URL" },
  { plugin_id: "google_dv360", kind: "dsp", provider: "dv360", label: "Google DV360", capabilities: ["activate_campaign", "optimize_bids", "audience_sync"], endpoint_env: "DV360_BASE_URL" },
  { plugin_id: "pubmatic", kind: "ssp", provider: "pubmatic", label: "PubMatic", capabilities: ["inventory_activation", "yield_optimization"], endpoint_env: "PUBMATIC_BASE_URL" },
  { plugin_id: "gam", kind: "gam", provider: "google_ad_manager", label: "Google Ad Manager", capabilities: ["inventory_activation", "line_item_delivery"], endpoint_env: "GAM_BASE_URL" },
  { plugin_id: "ad_exchange", kind: "ad_exchange", provider: "adx_generic", label: "Ad Exchange", capabilities: ["inventory_activation"], endpoint_env: "ADX_BASE_URL" },
  { plugin_id: "facebook_ads", kind: "meta", provider: "meta", label: "Facebook Ads", capabilities: ["activate_campaign", "social_distribution"], endpoint_env: "META_BASE_URL" },
  { plugin_id: "instagram_ads", kind: "instagram", provider: "meta_instagram", label: "Instagram Ads", capabilities: ["activate_campaign", "social_distribution"], endpoint_env: "META_BASE_URL" },
  { plugin_id: "x_ads", kind: "x", provider: "x_ads", label: "X Ads", capabilities: ["activate_campaign", "social_distribution"], endpoint_env: "X_BASE_URL" },
  { plugin_id: "youtube_ads", kind: "youtube", provider: "google_ads", label: "YouTube Ads", capabilities: ["activate_campaign", "video_distribution"], endpoint_env: "YOUTUBE_BASE_URL" },
  { plugin_id: "ticketmaster", kind: "ticketing", provider: "ticketmaster", label: "Ticketmaster", capabilities: ["inventory_sync", "conversion_tracking"], endpoint_env: "TICKETING_BASE_URL" },
  { plugin_id: "stats_perform", kind: "sports_events", provider: "stats_perform", label: "Stats Perform", capabilities: ["live_events", "match_context"], endpoint_env: "SPORTS_EVENTS_BASE_URL" },
  { plugin_id: "espn_data", kind: "sports_events", provider: "espn", label: "ESPN Data Feed", capabilities: ["live_events", "news_signals"], endpoint_env: "ESPN_BASE_URL" },
  { plugin_id: "dazn_stream", kind: "live_match", provider: "dazn", label: "DAZN Streaming", capabilities: ["live_match_markers", "stream_context"], endpoint_env: "DAZN_BASE_URL" },
  { plugin_id: "hubo_stream", kind: "live_match", provider: "hubo", label: "Hubo Streaming", capabilities: ["live_match_markers", "stream_context"], endpoint_env: "HUBO_BASE_URL" },
  { plugin_id: "salesforce_cdp", kind: "rt_cdp", provider: "salesforce", label: "Salesforce CDP", capabilities: ["audience_sync", "profile_enrichment"], endpoint_env: "SALESFORCE_CDP_BASE_URL" },
  { plugin_id: "adobe_cdp", kind: "rt_cdp", provider: "adobe", label: "Adobe RT-CDP", capabilities: ["audience_sync", "profile_enrichment"], endpoint_env: "ADOBE_CDP_BASE_URL" },
  { plugin_id: "snowflake_analytics", kind: "analytics", provider: "snowflake", label: "Snowflake Analytics", capabilities: ["warehouse_export", "reporting"], endpoint_env: "SNOWFLAKE_BASE_URL" },
  { plugin_id: "databricks_analytics", kind: "analytics", provider: "databricks", label: "Databricks Analytics", capabilities: ["lakehouse_export", "reporting"], endpoint_env: "DATABRICKS_BASE_URL" },
  { plugin_id: "nielsen_reports", kind: "analytics", provider: "nielsen", label: "Nielsen Reports", capabilities: ["audience_measurement", "reach_reporting"], endpoint_env: "NIELSEN_BASE_URL" },
  { plugin_id: "stripe_payments", kind: "payments", provider: "stripe", label: "Stripe Payments", capabilities: ["checkout", "subscription", "payout_ledger"], endpoint_env: "STRIPE_BASE_URL" },
  { plugin_id: "aws_hosting", kind: "infra", provider: "aws", label: "AWS Hosting", capabilities: ["runtime_hosting", "storage", "messaging"], endpoint_env: "AWS_BASE_URL" },
  { plugin_id: "nvidia_modeling", kind: "modeling", provider: "nvidia", label: "NVIDIA Modeling", capabilities: ["gpu_training", "inference"], endpoint_env: "NVIDIA_BASE_URL" },
  { plugin_id: "social_listening", kind: "social_listening", provider: "brandwatch", label: "Social Listening", capabilities: ["sentiment", "trend_detection"], endpoint_env: "SOCIAL_BASE_URL" },
  { plugin_id: "dtc", kind: "dtc", provider: "club_app_web", label: "DTC App/Website", capabilities: ["onsite_delivery", "first_party_tracking"], endpoint_env: "DTC_BASE_URL" },
  { plugin_id: "inapp", kind: "inapp", provider: "native", label: "In-App Inventory", capabilities: ["onsite_delivery", "push_offers"], endpoint_env: "" },
];

app.post("/tenants/:tenant_id/onboarding/plugins", async (req, res) => {
  try {
    const scope = requireTenantScope(req, req.params.tenant_id);
    if (!scope.ok) return res.status(scope.code).json({ error: scope.error });
    const tenantId = req.params.tenant_id;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.json({ status: "ok", connected: [] });

    const connected = [];
    for (const item of items) {
      const pluginId = item?.plugin_id;
      if (!pluginId) continue;

      const plugin = INTEGRATION_CATALOG.find((p) => p.plugin_id === pluginId);
      if (!plugin) continue;

      const config = {
        mode: item?.mode || "placeholder",
        provider: plugin.provider,
        plugin_id: plugin.plugin_id,
        base_url: item?.base_url || "",
        account_id: item?.account_id || "",
        api_key_ref: item?.api_key_ref || "",
        ...(item?.extra || {}),
      };

      await adminPost("/integrations", { tenant_id: tenantId, kind: plugin.kind, config });
      connected.push({ plugin_id: plugin.plugin_id, kind: plugin.kind, provider: plugin.provider, mode: config.mode });
    }

    return res.json({ status: "ok", tenant_id: tenantId, connected });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
});
