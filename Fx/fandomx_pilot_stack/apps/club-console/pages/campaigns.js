import { useEffect, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const defaultTenant = "club_demo";

export default function Campaigns() {
  const [tenantId, setTenantId] = useState(defaultTenant);
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({ name: "", objective: "conversions", budget: 50000, channel: "meta" });
  const [segForm, setSegForm] = useState({ name: "hardcore_fans", rule: "rfm_score > 7" });
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const [c, s] = await Promise.all([
        jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/campaigns`).catch(() => []),
        jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/segments`).catch(() => [])
      ]);
      setCampaigns(c);
      setSegments(s);
    } catch (e) {
      setMsg(String(e.message || e));
    }
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  async function createCampaign(e) {
    e.preventDefault();
    try {
      await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/campaigns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm({ ...form, name: "" });
      setMsg("Campaign created");
      load();
    } catch (err) {
      setMsg(String(err.message || err));
    }
  }

  async function createSegment(e) {
    e.preventDefault();
    try {
      await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/segments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(segForm)
      });
      setMsg("Segment created");
      load();
    } catch (err) {
      setMsg(String(err.message || err));
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Campaigns</h1>
      <div style={{ marginBottom: 12 }}>
        Tenant ID: <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ padding: 6, width: 250 }} />
      </div>
      {msg && <p style={{ color: "#1b5e20" }}>{msg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <form onSubmit={createCampaign} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Create Campaign</h2>
          <p><input required placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <p>
            <select value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ width: "100%", padding: 8 }}>
              <option value="reach">Reach</option><option value="engagement">Engagement</option><option value="conversions">Conversions</option>
            </select>
          </p>
          <p>
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} style={{ width: "100%", padding: 8 }}>
              <option value="meta">Meta</option><option value="google">Google</option><option value="youtube">YouTube</option><option value="inapp">In-App</option>
            </select>
          </p>
          <p><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value || 0) })} style={{ width: "100%", padding: 8 }} /></p>
          <button type="submit">Create</button>
        </form>

        <form onSubmit={createSegment} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Create Segment</h2>
          <p><input required placeholder="Segment name" value={segForm.name} onChange={(e) => setSegForm({ ...segForm, name: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <p><input required placeholder="Rule expression" value={segForm.rule} onChange={(e) => setSegForm({ ...segForm, rule: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <button type="submit">Create</button>
        </form>
      </div>

      <h2>Campaign List</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Name</th><th>Objective</th><th>Channel</th><th>Budget</th><th>Status</th></tr></thead>
        <tbody>
          {campaigns.map((c) => <tr key={c.campaign_id}><td>{c.campaign_id}</td><td>{c.name}</td><td>{c.objective}</td><td>{c.channel}</td><td>{c.budget}</td><td>{c.status}</td></tr>)}
          {!campaigns.length && <tr><td colSpan="6">No campaigns</td></tr>}
        </tbody>
      </table>

      <h2>Segment List</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Name</th><th>Rule</th></tr></thead>
        <tbody>
          {segments.map((s) => <tr key={s.segment_id}><td>{s.segment_id}</td><td>{s.name}</td><td>{s.rule}</td></tr>)}
          {!segments.length && <tr><td colSpan="3">No segments</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
