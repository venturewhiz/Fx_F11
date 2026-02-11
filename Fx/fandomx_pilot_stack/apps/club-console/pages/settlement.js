import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

export default function Settlement() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  async function runSettlement() {
    await jsonFetch(`${API_GATEWAY_URL}/finance/settlement/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settlement_date: date }),
    });
    setMsg("Settlement job completed");
    await loadSummary();
  }

  async function loadSummary() {
    const out = await jsonFetch(`${API_GATEWAY_URL}/finance/settlement/summary?settlement_date=${encodeURIComponent(date)}`).catch(() => []);
    setRows(Array.isArray(out) ? out : []);
  }

  const exportHref = `${API_GATEWAY_URL}/finance/settlement/export?settlement_date=${encodeURIComponent(date)}`;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Settlement (Shadow)</h1>
      <p>Rights-aware daily split visibility across operator, inventory owner, and platform.</p>
      <p>
        Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 6 }} />
        <button onClick={runSettlement} style={{ marginLeft: 8 }}>Run</button>
        <button onClick={loadSummary} style={{ marginLeft: 8 }}>Refresh</button>
        <a href={exportHref} style={{ marginLeft: 8 }}>Export CSV</a>
      </p>
      {msg && <p style={{ color: "#1b5e20" }}>{msg}</p>}

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead>
          <tr>
            <th>Operator</th><th>Owner</th><th>Inventory</th><th>Channel</th><th>Gross Spend</th><th>Operator Share</th><th>Owner Share</th><th>Platform Share</th><th>Rule</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.operator_id}</td><td>{r.inventory_owner_id}</td><td>{r.inventory_id}</td><td>{r.channel}</td>
              <td>{r.gross_spend}</td><td>{r.operator_share}</td><td>{r.owner_share}</td><td>{r.platform_share}</td><td>{r.rule_id || "-"}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="9">No settlement rows for selected date.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
