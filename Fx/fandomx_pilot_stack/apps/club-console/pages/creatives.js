import { useEffect, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const defaultTenant = "club_demo";

export default function Creatives() {
  const [tenantId, setTenantId] = useState(defaultTenant);
  const [creatives, setCreatives] = useState([]);
  const [offers, setOffers] = useState([]);
  const [toneFilter, setToneFilter] = useState("all");
  const [creativeForm, setCreativeForm] = useState({ name: "", tone: "upbeat", moment_fit: "team_success", fatigue_limit: 6 });
  const [offerForm, setOfferForm] = useState({ name: "Merch 15% Off", type: "merch", code: "M15" });
  const [msg, setMsg] = useState("");

  async function load() {
    const [c, o] = await Promise.all([
      jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/creatives`).catch(() => []),
      jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/offers`).catch(() => [])
    ]);
    setCreatives(c);
    setOffers(o);
  }

  useEffect(() => { load(); }, [tenantId]);

  async function createCreative(e) {
    e.preventDefault();
    await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/creatives`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(creativeForm)
    });
    setMsg("Creative added");
    setCreativeForm({ ...creativeForm, name: "" });
    load();
  }

  async function createOffer(e) {
    e.preventDefault();
    await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/offers`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(offerForm)
    });
    setMsg("Offer added");
    setOfferForm({ ...offerForm, name: "" });
    load();
  }

  const filteredCreatives = creatives.filter((c) => toneFilter === "all" || c.tone === toneFilter);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Creatives & Offers</h1>
      <div style={{ marginBottom: 12 }}>
        Tenant ID: <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ padding: 6, width: 250 }} />
      </div>
      {msg && <p style={{ color: "#1b5e20" }}>{msg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <form onSubmit={createCreative} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Add Creative</h2>
          <p><input required placeholder="Creative name" value={creativeForm.name} onChange={(e) => setCreativeForm({ ...creativeForm, name: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <p>
            <select value={creativeForm.tone} onChange={(e) => setCreativeForm({ ...creativeForm, tone: e.target.value })} style={{ width: "100%", padding: 8 }}>
              <option value="upbeat">Upbeat</option><option value="consoling">Consoling</option><option value="neutral">Neutral</option>
            </select>
          </p>
          <p>
            <select value={creativeForm.moment_fit} onChange={(e) => setCreativeForm({ ...creativeForm, moment_fit: e.target.value })} style={{ width: "100%", padding: 8 }}>
              <option value="team_success">Team Success</option><option value="team_failure">Team Failure</option><option value="turning_point">Turning Point</option>
            </select>
          </p>
          <p><input type="number" value={creativeForm.fatigue_limit} onChange={(e) => setCreativeForm({ ...creativeForm, fatigue_limit: Number(e.target.value || 0) })} style={{ width: "100%", padding: 8 }} /></p>
          <button type="submit">Add Creative</button>
        </form>

        <form onSubmit={createOffer} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Add Offer</h2>
          <p><input required placeholder="Offer name" value={offerForm.name} onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <p>
            <select value={offerForm.type} onChange={(e) => setOfferForm({ ...offerForm, type: e.target.value })} style={{ width: "100%", padding: 8 }}>
              <option value="merch">Merch</option><option value="ticket">Ticket</option><option value="subscription">Subscription</option>
            </select>
          </p>
          <p><input placeholder="Coupon code" value={offerForm.code} onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })} style={{ width: "100%", padding: 8 }} /></p>
          <button type="submit">Add Offer</button>
        </form>
      </div>

      <h2>Creative Library</h2>
      <p>Tone Filter: <select value={toneFilter} onChange={(e) => setToneFilter(e.target.value)}><option value="all">All</option><option value="upbeat">upbeat</option><option value="consoling">consoling</option><option value="urgent">urgent</option></select></p>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Name</th><th>Tone</th><th>Moment Fit</th><th>Fatigue Limit</th></tr></thead>
        <tbody>
          {filteredCreatives.map((c) => <tr key={c.creative_id}><td>{c.creative_id}</td><td>{c.name}</td><td>{c.tone}</td><td>{c.moment_fit}</td><td>{c.fatigue_limit}</td></tr>)}
          {!filteredCreatives.length && <tr><td colSpan="5">No creatives</td></tr>}
        </tbody>
      </table>

      <h2>Offers</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Code</th></tr></thead>
        <tbody>
          {offers.map((o) => <tr key={o.offer_id}><td>{o.offer_id}</td><td>{o.name}</td><td>{o.type}</td><td>{o.code}</td></tr>)}
          {!offers.length && <tr><td colSpan="4">No offers</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
