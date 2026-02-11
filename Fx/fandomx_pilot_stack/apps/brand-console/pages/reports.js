import { useEffect, useMemo, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";

export default function Reports() {
  const [alloc, setAlloc] = useState([]);

  useEffect(() => {
    jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).then((a) => setAlloc(a?.payload || [])).catch(() => setAlloc([]));
  }, []);

  const byChannel = useMemo(() => {
    const map = {};
    alloc.forEach((x) => {
      const ch = x.channel || "unknown";
      if (!map[ch]) map[ch] = { spend: 0, roas: 0, count: 0 };
      map[ch].spend += x.allocated_budget || 0;
      map[ch].roas += x.expected_roas || 0;
      map[ch].count += 1;
    });
    return Object.entries(map).map(([channel, v]) => ({ channel, spend: Math.round(v.spend), avg_roas: v.count ? (v.roas / v.count).toFixed(2) : "0.00" }));
  }, [alloc]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Reports</h1>
      <p>Cross-channel ROI view with moment-driven performance signals.</p>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead><tr><th>Channel</th><th>Allocated Spend</th><th>Average ROAS</th></tr></thead>
        <tbody>
          {byChannel.map((r) => <tr key={r.channel}><td>{r.channel}</td><td>₹{r.spend}</td><td>{r.avg_roas}</td></tr>)}
          {!byChannel.length && <tr><td colSpan="3">No data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
