import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";

function cardStyle() {
  return { background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 16 };
}

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [bids, setBids] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [a, b, t] = await Promise.all([
          jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
          jsonFetch(`${ORCHESTRATOR_URL}/latest/bids`).catch(() => ({})),
          jsonFetch(`${API_GATEWAY_URL}/tenants`).catch(() => [])
        ]);
        setAlloc(a?.payload || []);
        setBids(b?.payload || []);
        setTenants(Array.isArray(t) ? t : []);
      } catch (_) {}
    }
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  const kpis = useMemo(() => {
    const spend = alloc.reduce((s, x) => s + (x.allocated_budget || 0), 0);
    const avgRoas = alloc.length ? alloc.reduce((s, x) => s + (x.expected_roas || 0), 0) / alloc.length : 0;
    const avgAcos = alloc.length ? alloc.reduce((s, x) => s + (x.expected_acos || 0), 0) / alloc.length : 0;
    return { spend, avgRoas, avgAcos };
  }, [alloc]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p style={{ marginTop: -6, color: "#425066" }}>Live fan-moment pulse, active allocation outputs, and tenant readiness.</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={cardStyle()}><strong>Total Allocated Budget</strong><div style={{ fontSize: 24, marginTop: 8 }}>₹{Math.round(kpis.spend)}</div></div>
        <div style={cardStyle()}><strong>Average Expected ROAS</strong><div style={{ fontSize: 24, marginTop: 8 }}>{kpis.avgRoas.toFixed(2)}</div></div>
        <div style={cardStyle()}><strong>Average Expected ACOS</strong><div style={{ fontSize: 24, marginTop: 8 }}>{kpis.avgAcos.toFixed(3)}</div></div>
        <div style={cardStyle()}><strong>Active Bids</strong><div style={{ fontSize: 24, marginTop: 8 }}>{bids.length}</div></div>
      </section>

      <section style={cardStyle()}>
        <h2 style={{ marginTop: 0 }}>Tenant Readiness</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef" }}>
          <thead>
            <tr><th>Tenant</th><th>Type</th><th>Integrations</th><th>Created</th></tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.tenant_id}>
                <td>{t.name || t.tenant_id}</td><td>{t.type}</td><td>{Object.keys(t.integrations || {}).length}</td><td>{t.created_at || "-"}</td>
              </tr>
            ))}
            {!tenants.length && <tr><td colSpan="4">No tenants created yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section style={{ ...cardStyle(), marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Latest Allocations</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef" }}>
          <thead>
            <tr><th>Channel</th><th>Campaign</th><th>Segment</th><th>Moment</th><th>Creative</th><th>Offer</th><th>Budget</th><th>ROAS</th></tr>
          </thead>
          <tbody>
            {alloc.slice(0, 12).map((x, i) => (
              <tr key={i}>
                <td>{x.channel}</td><td>{x.campaign_id}</td><td>{x.segment_id}</td><td>{x.moment}</td><td>{x.creative_id}</td><td>{x.offer_id}</td><td>{Math.round(x.allocated_budget || 0)}</td><td>{(x.expected_roas || 0).toFixed(2)}</td>
              </tr>
            ))}
            {!alloc.length && <tr><td colSpan="8">No optimization output yet. Trigger a moment event first.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
