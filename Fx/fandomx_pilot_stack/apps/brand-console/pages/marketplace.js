import { useEffect, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

export default function Marketplace() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    jsonFetch(`${API_GATEWAY_URL}/marketplace/inventory`).then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Marketplace</h1>
      <p>Discover clubs/leagues/broadcasters with moment-targetable inventory.</p>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead><tr><th>Property</th><th>Sport</th><th>Geo</th><th>Safety</th><th>Formats</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.club_tenant_id}>
              <td>{r.club_name}</td>
              <td>{r.sport}</td>
              <td>{r.geo}</td>
              <td>{r.brand_safety_rating}</td>
              <td>{r.inventory.map((i) => `${i.format} (${i.channels.join(",")})`).join(" | ")}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="5">No marketplace inventory available. Register club tenants first.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
