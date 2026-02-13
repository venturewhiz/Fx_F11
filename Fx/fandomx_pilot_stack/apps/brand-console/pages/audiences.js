import { useEffect, useMemo, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, SectionCard } from "../lib/ui/Primitives";

const LS_KEY = "fx_brand_aud_cfg_v2";

export default function BrandAudiences() {
  const [alloc, setAlloc] = useState([]);
  const [cfg, setCfg] = useState({ enabled: {}, weight: {} });

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

  const segs = useMemo(() => Array.from(new Set(alloc.map((x) => x.segment_id).filter(Boolean))), [alloc]);

  const rows = useMemo(() => {
    const by = {};
    for (const x of alloc) {
      const s = x.segment_id || "unknown";
      if (!by[s]) by[s] = { spend: 0, roas: 0, n: 0 };
      by[s].spend += x.allocated_budget || 0;
      by[s].roas += x.expected_roas || 0;
      by[s].n += 1;
    }
    return Object.entries(by).map(([s, v]) => {
      const on = cfg.enabled[s] ?? true;
      const w = Number(cfg.weight[s] ?? 1);
      const roas = v.n ? v.roas / v.n : 0;
      return [s, on ? "Included" : "Suppressed", w.toFixed(2), Math.round(v.spend).toLocaleString("en-IN"), roas.toFixed(2), (on ? roas * w : 0).toFixed(2)];
    });
  }, [alloc, cfg]);

  const setField = (s, key, val) => setCfg((p) => ({ ...p, [key]: { ...(p[key] || {}), [s]: val } }));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Audience Segment Dashboard</h1>
      <SectionCard title="Controls" className="mb-14">
        <div style={{ display: "grid", gap: 10 }}>
          {segs.map((s) => (
            <div key={s} style={{ display: "grid", gridTemplateColumns: "220px 140px 220px", gap: 10 }}>
              <strong>{s}</strong>
              <button className="fx-btn-ghost" onClick={() => setField(s, "enabled", !(cfg.enabled[s] ?? true))}>
                {(cfg.enabled[s] ?? true) ? "Suppress" : "Include"}
              </button>
              <label>Weight<input type="number" step="0.1" min="0" value={cfg.weight[s] ?? 1} onChange={(e) => setField(s, "weight", e.target.value)} /></label>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Segment Metrics">
        <DataTable headers={["Segment", "Status", "Weight", "Spend", "ROAS", "Weighted ROI"]} rows={rows} emptyText="No segment rows." />
      </SectionCard>
    </div>
  );
}
