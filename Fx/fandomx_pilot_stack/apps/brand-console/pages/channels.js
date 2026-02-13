import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, SectionCard } from "../lib/ui/Primitives";

const LS_KEY = "fx_brand_channels_cfg_v2";

export default function BrandChannels() {
  const [alloc, setAlloc] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cfg, setCfg] = useState({ enabled: {}, bidFloor: {}, capPct: {} });

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) setCfg(JSON.parse(raw));
    async function load() {
      const [a, inv] = await Promise.all([
        jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
        jsonFetch(`${API_GATEWAY_URL}/marketplace/inventory`).catch(() => []),
      ]);
      setAlloc(a?.payload || []);
      setInventory(Array.isArray(inv) ? inv : []);
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(cfg)), [cfg]);

  const channels = useMemo(() => Array.from(new Set(alloc.map((x) => x.channel).filter(Boolean))), [alloc]);

  const rows = useMemo(() => {
    const by = {};
    for (const x of alloc) {
      const c = x.channel || "unknown";
      if (!by[c]) by[c] = { spend: 0, roas: 0, n: 0 };
      by[c].spend += x.allocated_budget || 0;
      by[c].roas += x.expected_roas || 0;
      by[c].n += 1;
    }
    return Object.entries(by).map(([c, v]) => {
      const enabled = cfg.enabled[c] ?? true;
      const floor = Number(cfg.bidFloor[c] ?? 1);
      const cap = Number(cfg.capPct[c] ?? 100);
      const spend = enabled ? Math.round((v.spend * cap) / 100) : 0;
      const roi = v.n ? v.roas / v.n : 0;
      return [c, enabled ? "ON" : "OFF", floor.toFixed(2), `${cap}%`, spend.toLocaleString("en-IN"), roi.toFixed(2)];
    });
  }, [alloc, cfg]);

  const setField = (c, key, val) => setCfg((p) => ({ ...p, [key]: { ...(p[key] || {}), [c]: val } }));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Channel Dashboard</h1>
      <SectionCard title="Controls" className="mb-14">
        <div style={{ display: "grid", gap: 10 }}>
          {channels.map((c) => (
            <div key={c} style={{ display: "grid", gridTemplateColumns: "180px 130px 180px 180px", gap: 10 }}>
              <strong>{c}</strong>
              <button className="fx-btn-ghost" onClick={() => setField(c, "enabled", !(cfg.enabled[c] ?? true))}>
                {(cfg.enabled[c] ?? true) ? "Disable" : "Enable"}
              </button>
              <label>Bid Floor<input type="number" step="0.1" value={cfg.bidFloor[c] ?? 1} onChange={(e) => setField(c, "bidFloor", e.target.value)} /></label>
              <label>Max Budget %<input type="number" min="0" max="100" value={cfg.capPct[c] ?? 100} onChange={(e) => setField(c, "capPct", e.target.value)} /></label>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Channel Table">
        <DataTable headers={["Channel", "Status", "Bid Floor", "Max %", "Effective Spend", "ROI"]} rows={rows} emptyText={`No live channels yet. Inventory: ${inventory.length}`} />
      </SectionCard>
    </div>
  );
}
