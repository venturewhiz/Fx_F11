import { useEffect, useMemo, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, SectionCard } from "../lib/ui/Primitives";

const LS_KEY = "fx_club_rights_cfg_v2";

export default function ClubChannels() {
  const [alloc, setAlloc] = useState([]);
  const [cfg, setCfg] = useState({ premium: false, floor: 1.0, rightsRule: "balanced" });

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) setCfg(JSON.parse(raw));
    async function load() {
      const a = await jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({}));
      setAlloc(a?.payload || []);
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(cfg)), [cfg]);

  const rows = useMemo(() => {
    const total = alloc.reduce((s, x) => s + (x.allocated_budget || 0), 0);
    const p = cfg.premium ? 1.2 : 1.0;
    const f = Math.max(0.8, Number(cfg.floor || 1));
    const r = cfg.rightsRule === "yield_first" ? 1.12 : cfg.rightsRule === "sponsor_first" ? 1.08 : 1.0;
    const net = Math.round(total * p * f * r);
    return [
      ["Club-owned App", Math.round(net * 0.36).toLocaleString("en-IN"), "36%"],
      ["League Inventory", Math.round(net * 0.27).toLocaleString("en-IN"), "27%"],
      ["Broadcaster Licensed", Math.round(net * 0.23).toLocaleString("en-IN"), "23%"],
      ["DSP Extension", Math.round(net * 0.14).toLocaleString("en-IN"), "14%"],
    ];
  }, [alloc, cfg]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Inventory & Rights Dashboard</h1>
      <SectionCard title="Rights Controls" className="mb-14">
        <div style={{ display: "grid", gridTemplateColumns: "220px 220px 240px", gap: 10 }}>
          <button className="fx-btn-ghost" onClick={() => setCfg((p) => ({ ...p, premium: !p.premium }))}>
            Premium Mode: {cfg.premium ? "ON" : "OFF"}
          </button>
          <label>Floor Multiplier<input type="number" step="0.1" min="0.8" max="2.0" value={cfg.floor} onChange={(e) => setCfg((p) => ({ ...p, floor: e.target.value }))} /></label>
          <label>Rights Rule<select value={cfg.rightsRule} onChange={(e) => setCfg((p) => ({ ...p, rightsRule: e.target.value }))}>
            <option value="balanced">Balanced</option>
            <option value="sponsor_first">Sponsor First</option>
            <option value="yield_first">Yield First</option>
          </select></label>
        </div>
      </SectionCard>
      <SectionCard title="Rights Revenue Split">
        <DataTable headers={["Layer", "Revenue", "Share"]} rows={rows} />
      </SectionCard>
    </div>
  );
}
