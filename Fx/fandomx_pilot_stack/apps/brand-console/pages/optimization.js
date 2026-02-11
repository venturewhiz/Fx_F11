import { useEffect, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";

export default function Optimization() {
  const [alloc, setAlloc] = useState([]);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    async function load() {
      const [a, b] = await Promise.all([
        jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
        jsonFetch(`${ORCHESTRATOR_URL}/latest/bids`).catch(() => ({}))
      ]);
      setAlloc(a?.payload || []);
      setBids(b?.payload || []);
    }
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Optimization</h1>
      <p>Real-time budget reallocation and explainable bid multipliers by moment and segment.</p>

      <h2>Budget Reallocation</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff", marginBottom: 14 }}>
        <thead><tr><th>Channel</th><th>Campaign</th><th>Segment</th><th>Moment</th><th>Budget</th><th>EV</th><th>ROAS</th></tr></thead>
        <tbody>
          {alloc.map((x, i) => <tr key={i}><td>{x.channel}</td><td>{x.campaign_id}</td><td>{x.segment_id}</td><td>{x.moment}</td><td>{Math.round(x.allocated_budget || 0)}</td><td>{(x.ev || 0).toFixed(3)}</td><td>{(x.expected_roas || 0).toFixed(2)}</td></tr>)}
          {!alloc.length && <tr><td colSpan="7">No allocation data yet.</td></tr>}
        </tbody>
      </table>

      <h2>Bid Multipliers</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead><tr><th>Channel</th><th>Campaign</th><th>Segment</th><th>Moment</th><th>Base Bid</th><th>Multiplier</th><th>Final Bid</th></tr></thead>
        <tbody>
          {bids.map((x, i) => <tr key={i}><td>{x.channel}</td><td>{x.campaign_id}</td><td>{x.segment_id}</td><td>{x.moment}</td><td>{(x.base_bid || 0).toFixed(2)}</td><td>{(x.bid_multiplier || 1).toFixed(2)}</td><td>{(x.final_bid || 0).toFixed(2)}</td></tr>)}
          {!bids.length && <tr><td colSpan="7">No bid data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
