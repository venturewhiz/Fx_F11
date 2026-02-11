import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";

function cardStyle() {
  return { background: "#fff", border: "1px solid #e4dbc6", borderRadius: 12, padding: 16 };
}

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    async function load() {
      const [a, inv] = await Promise.all([
        jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
        jsonFetch(`${API_GATEWAY_URL}/marketplace/inventory`).catch(() => [])
      ]);
      setAlloc(a?.payload || []);
      setInventory(Array.isArray(inv) ? inv : []);
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => {
    const totalSpend = alloc.reduce((sum, a) => sum + (a.allocated_budget || 0), 0);
    const avgRoas = alloc.length ? alloc.reduce((sum, a) => sum + (a.expected_roas || 0), 0) / alloc.length : 0;
    return { totalSpend, avgRoas };
  }, [alloc]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p>Cross-property campaign control with moment-aware budget and bid updates.</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={cardStyle()}><strong>Marketplace Properties</strong><div style={{ fontSize: 24, marginTop: 8 }}>{inventory.length}</div></div>
        <div style={cardStyle()}><strong>Current Allocated Spend</strong><div style={{ fontSize: 24, marginTop: 8 }}>₹{Math.round(summary.totalSpend)}</div></div>
        <div style={cardStyle()}><strong>Average Expected ROAS</strong><div style={{ fontSize: 24, marginTop: 8 }}>{summary.avgRoas.toFixed(2)}</div></div>
      </section>

      <section style={cardStyle()}>
        <h2 style={{ marginTop: 0 }}>Top Allocations</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6" }}>
          <thead><tr><th>Channel</th><th>Campaign</th><th>Segment</th><th>Moment</th><th>Budget</th><th>ROAS</th></tr></thead>
          <tbody>
            {alloc.slice(0, 12).map((x, i) => (
              <tr key={i}><td>{x.channel}</td><td>{x.campaign_id}</td><td>{x.segment_id}</td><td>{x.moment}</td><td>{Math.round(x.allocated_budget || 0)}</td><td>{(x.expected_roas || 0).toFixed(2)}</td></tr>
            ))}
            {!alloc.length && <tr><td colSpan="6">No allocations yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
