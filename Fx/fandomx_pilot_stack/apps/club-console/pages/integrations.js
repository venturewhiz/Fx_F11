import { useEffect, useState } from "react";
import { API_GATEWAY_URL, jsonFetch } from "../lib/config";

const defaults = {
  cdp: '{"provider":"Segment","write_key":"demo"}',
  ecommerce: '{"provider":"Shopify","shop":"demo.myshopify.com"}',
  ticketing: '{"provider":"Ticketmaster"}',
  scores: '{"provider":"Opta"}',
  streaming: '{"provider":"HLS","player":"custom"}',
  social: '{"provider":"X","handle":"@club"}'
};

export default function Integrations() {
  const [tenantId, setTenantId] = useState("club_demo");
  const [kind, setKind] = useState("cdp");
  const [config, setConfig] = useState(defaults.cdp);
  const [list, setList] = useState({});
  const [msg, setMsg] = useState("");

  async function load() {
    const out = await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/integrations`).catch(() => ({}));
    setList(out || {});
  }

  useEffect(() => { load(); }, [tenantId]);

  async function testConnection() {
    try {
      const parsed = JSON.parse(config);
      const base = parsed.base_url || parsed.url || "";
      if (!base) {
        setMsg("No base_url/url in config to test");
        return;
      }
      const r = await fetch(base, { method: "GET" });
      setMsg(`Test ${r.ok ? "OK" : "FAILED"}: ${r.status}`);
    } catch (err) {
      setMsg(`Test Error: ${String(err.message || err)}`);
    }
  }

  async function connect(e) {
    e.preventDefault();
    try {
      await jsonFetch(`${API_GATEWAY_URL}/tenants/${tenantId}/integrations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, config: JSON.parse(config) })
      });
      setMsg(`${kind} connected`);
      load();
    } catch (err) {
      setMsg(`Error: ${String(err.message || err)}`);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Integrations Hub</h1>
      <p>Configure CDP, social, commerce, ticketing, live scores, and streaming sources.</p>
      <div style={{ marginBottom: 12 }}>
        Tenant ID: <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ padding: 6, width: 250 }} />
      </div>
      {msg && <p style={{ color: msg.startsWith("Error") ? "#b71c1c" : "#1b5e20" }}>{msg}</p>}

      <form onSubmit={connect} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p>
          <select value={kind} onChange={(e) => { setKind(e.target.value); setConfig(defaults[e.target.value]); }} style={{ width: 250, padding: 8 }}>
            <option value="cdp">CDP/CRM</option>
            <option value="social">Social</option>
            <option value="ecommerce">Ecommerce</option>
            <option value="ticketing">Ticketing</option>
            <option value="scores">Live Scores</option>
            <option value="streaming">Streaming</option>
          </select>
        </p>
        <p><textarea rows={5} value={config} onChange={(e) => setConfig(e.target.value)} style={{ width: "100%", padding: 8, fontFamily: "monospace" }} /></p>
        <button type="submit">Connect Integration</button> <button type="button" onClick={testConnection}>Test Connection</button>
      </form>

      <h2>Connected Integrations</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", background: "#fff" }}>
        <thead><tr><th>Kind</th><th>Config</th></tr></thead>
        <tbody>
          {Object.entries(list).map(([k, v]) => <tr key={k}><td>{k}</td><td><pre style={{ margin: 0 }}>{JSON.stringify(v, null, 2)}</pre></td></tr>)}
          {!Object.keys(list).length && <tr><td colSpan="2">No integrations configured</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
