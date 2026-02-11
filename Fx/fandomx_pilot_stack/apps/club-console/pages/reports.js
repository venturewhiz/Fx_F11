import { useEffect, useMemo, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";

export default function Reports() {
  const [alloc, setAlloc] = useState([]);

  useEffect(() => {
    async function load() {
      const a = await jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({}));
      setAlloc(a?.payload || []);
    }
    load();
  }, []);

  const byMoment = useMemo(() => {
    const map = {};
    alloc.forEach((x) => {
      const k = x.moment || "unknown";
      if (!map[k]) map[k] = { spend: 0, roas: 0, count: 0 };
      map[k].spend += x.allocated_budget || 0;
      map[k].roas += x.expected_roas || 0;
      map[k].count += 1;
    });
    return Object.entries(map).map(([moment, v]) => ({
      moment,
      spend: Math.round(v.spend),
      avg_roas: v.count ? (v.roas / v.count).toFixed(2) : "0.00"
    }));
  }, [alloc]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Reports</h1>
      <p>Moment-level performance and optimization outputs for sponsor and club reporting.</p>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>Moment</th><th>Allocated Spend</th><th>Average ROAS</th></tr></thead>
        <tbody>
          {byMoment.map((r) => <tr key={r.moment}><td>{r.moment}</td><td>₹{r.spend}</td><td>{r.avg_roas}</td></tr>)}
          {!byMoment.length && <tr><td colSpan="3">No optimization data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
