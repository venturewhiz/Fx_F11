import { useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

export default function Settlement() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);

  async function loadSummary() {
    const out = await jsonFetch(`${API_GATEWAY_URL}/finance/settlement/summary?settlement_date=${encodeURIComponent(date)}`).catch(() => []);
    setRows(Array.isArray(out) ? out : []);
  }

  const exportHref = `${API_GATEWAY_URL}/finance/settlement/export?settlement_date=${encodeURIComponent(date)}`;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Settlement Visibility</h1>
      <p>Shadow settlement view for operator rights and inventory-owner splits.</p>
      <p>
        Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 6 }} />
        <button onClick={loadSummary} style={{ marginLeft: 8 }}>Refresh</button>
        <a href={exportHref} style={{ marginLeft: 8 }}>Export CSV</a>
      </p>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead>
          <tr>
            <th>Operator</th><th>Owner</th><th>Inventory</th><th>Channel</th><th>Gross Spend</th><th>Operator Share</th><th>Owner Share</th><th>Platform Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.operator_id}</td><td>{r.inventory_owner_id}</td><td>{r.inventory_id}</td><td>{r.channel}</td>
              <td>{r.gross_spend}</td><td>{r.operator_share}</td><td>{r.owner_share}</td><td>{r.platform_share}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="8">No settlement rows for selected date.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
