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
    const tenant_id = `brand_${uuid().slice(0, 8)}`;
    const payload = {
      tenant_id,
      name: req.body?.name || req.body?.brand_name || tenant_id,
      metadata: { type: "brand", ...req.body },
    };
    const out = await adminPost("/tenants", payload);
    res.json({ tenant_id: out.tenant_id });
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
    const out = await adminGet("/campaigns", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json(out?.items || []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/segments", async (req, res) => {
  try {
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
    const out = await adminGet("/segments", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, rule: x.definition?.rule || "" })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/creatives", async (req, res) => {
  try {
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
    const out = await adminGet("/creatives", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, ...(x.metadata || {}) })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/tenants/:tenant_id/offers", async (req, res) => {
  try {
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
    const out = await adminGet("/offers", `?tenant_id=${encodeURIComponent(req.params.tenant_id)}`);
    res.json((out?.items || []).map((x) => ({ ...x, ...(x.metadata || {}) })));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/marketplace/inventory", async (_req, res) => {
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
    const items = (rights?.items || []).map((r) => ({
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
