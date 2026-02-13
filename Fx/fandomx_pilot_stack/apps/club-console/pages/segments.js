import { useEffect, useMemo, useState } from "react";
import { ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, SectionCard } from "../lib/ui/Primitives";

const LS_KEY = "fx_club_seg_cfg_v2";

export default function ClubSegments() {
  const [alloc, setAlloc] = useState([]);
  const [cfg, setCfg] = useState({ rewardBoost: {}, contentBoost: {} });

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
      const rb = Number(cfg.rewardBoost[s] ?? 1);
      const cb = Number(cfg.contentBoost[s] ?? 1);
      const roas = v.n ? v.roas / v.n : 0;
      return [s, rb.toFixed(2), cb.toFixed(2), Math.round(v.spend).toLocaleString("en-IN"), roas.toFixed(2), (roas * rb * cb).toFixed(2)];
    });
  }, [alloc, cfg]);

  const setField = (s, key, val) => setCfg((p) => ({ ...p, [key]: { ...(p[key] || {}), [s]: val } }));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Fan Intelligence & Monetization</h1>
      <SectionCard title="Controls" className="mb-14">
        <div style={{ display: "grid", gap: 10 }}>
          {segs.map((s) => (
            <div key={s} style={{ display: "grid", gridTemplateColumns: "220px 220px 220px", gap: 10 }}>
              <strong>{s}</strong>
              <label>Reward Boost<input type="number" step="0.1" min="0.5" value={cfg.rewardBoost[s] ?? 1} onChange={(e) => setField(s, "rewardBoost", e.target.value)} /></label>
              <label>Content Boost<input type="number" step="0.1" min="0.5" value={cfg.contentBoost[s] ?? 1} onChange={(e) => setField(s, "contentBoost", e.target.value)} /></label>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Segment Monetization">
        <DataTable headers={["Segment", "Reward", "Content", "Spend", "ROAS", "Score"]} rows={rows} emptyText="No segment data." />
      </SectionCard>
    </div>
  );
}
