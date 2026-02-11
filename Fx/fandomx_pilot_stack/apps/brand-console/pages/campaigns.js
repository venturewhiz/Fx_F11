import { useEffect, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

export default function Campaigns() {
  const [tenantId, setTenantId] = useState("brand_demo");
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: "", objective: "conversions", budget: 100000, property: "club_demo", channel: "meta" });
  const [msg, setMsg] = useState("");

  async function load() {
    const out = await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/campaigns`).catch(() => []);
    setCampaigns(Array.isArray(out) ? out : []);
  }

  useEffect(() => { load(); }, [tenantId]);

  async function createCampaign(e) {
    e.preventDefault();
    try {
      await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/campaigns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      setMsg("Campaign created");
      setForm({ ...form, name: "" });
      load();
    } catch (err) {
      setMsg(`Error: ${String(err.message || err)}`);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Campaign Builder</h1>
      <div style={{ marginBottom: 12 }}>
        Brand Tenant ID: <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ width: 240, padding: 6 }} />
      </div>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}

      <form onSubmit={createCampaign} style={{ background: "#fff", border: "1px solid #e4dbc6", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" style={{ width: "100%", padding: 8 }} /></p>
        <p>
          <select value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ width: "100%", padding: 8 }}>
            <option value="reach">Reach</option><option value="engagement">Engagement</option><option value="conversions">Conversions</option>
          </select>
        </p>
        <p><input value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} placeholder="Target property tenant_id" style={{ width: "100%", padding: 8 }} /></p>
        <p>
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} style={{ width: "100%", padding: 8 }}>
            <option value="meta">Meta</option><option value="google">Google</option><option value="youtube">YouTube</option><option value="dsp">DSP</option><option value="inapp">In-App</option>
          </select>
        </p>
        <p><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value || 0) })} style={{ width: "100%", padding: 8 }} /></p>
        <button type="submit">Create Campaign</button>
      </form>

      <h2>Campaign List</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Name</th><th>Objective</th><th>Property</th><th>Channel</th><th>Budget</th><th>Status</th></tr></thead>
        <tbody>
          {campaigns.map((c) => <tr key={c.campaign_id}><td>{c.campaign_id}</td><td>{c.name}</td><td>{c.objective}</td><td>{c.property}</td><td>{c.channel}</td><td>{c.budget}</td><td>{c.status}</td></tr>)}
          {!campaigns.length && <tr><td colSpan="7">No campaigns yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
