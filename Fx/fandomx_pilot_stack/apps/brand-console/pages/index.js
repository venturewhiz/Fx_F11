import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, KpiCard, KpiGrid, SectionCard } from "../lib/ui/Primitives";
import { BarBlocks, MiniSparkline, ProgressList, RingMetric } from "../lib/ui/Widgets";

const fmtINR = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));

const DEMO_ALLOC = [
  { channel: "meta", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", allocated_budget: 30000, expected_roas: 1.93 },
  { channel: "meta", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", allocated_budget: 30000, expected_roas: 2.06 },
  { channel: "dsp", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", allocated_budget: 30000, expected_roas: 1.68 },
  { channel: "dsp", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", allocated_budget: 8400, expected_roas: 1.58 },
];

function MultiLineGraph({ a = [], b = [], c = [] }) {
  const w = 560, h = 170, p = 10;
  const all = [...a, ...b, ...c];
  const max = Math.max(...all, 1), min = Math.min(...all, 0), span = Math.max(1, max - min);
  const step = (w - p * 2) / Math.max(1, a.length - 1);
  const path = (arr) => arr.map((v, i) => {
    const x = p + i * step;
    const y = h - p - ((v - min) / span) * (h - p * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={path(a)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      <path d={path(b)} fill="none" stroke="#34d399" strokeWidth="2.5" />
      <path d={path(c)} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
    </svg>
  );
}

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
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

  const rows = alloc.length ? alloc : DEMO_ALLOC;
  const totalSpend = rows.reduce((s, x) => s + (x.allocated_budget || 0), 0);
  const avgRoas = rows.length ? rows.reduce((s, x) => s + (x.expected_roas || 0), 0) / rows.length : 0;
  const revenueAttributed = Math.round(totalSpend * avgRoas);
  const ltvRoas = +(avgRoas * 1.22).toFixed(2);

  const spendSeries = [24, 27, 29, 26, 31, 34, 33, 36, 39, 41, 43, 45];
  const revenueSeries = [31, 35, 39, 36, 42, 47, 45, 49, 56, 58, 62, 66];
  const upliftSeries = [5, 7, 9, 8, 12, 14, 13, 16, 19, 21, 23, 25];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Command Center</h1>
      <p>Maximize ROI with emotional and LTV weighted targeting.</p>

      <KpiGrid>
        <KpiCard label="Live Spend" value={`₹${Math.round(totalSpend)}`} />
        <KpiCard label="Revenue Attributed" value={`₹${fmtINR(revenueAttributed)}`} />
        <KpiCard label="ROAS" value={avgRoas.toFixed(2)} />
        <KpiCard label="LTV-Weighted ROAS" value={ltvRoas.toFixed(2)} />
        <KpiCard label="Active Match Triggers" value={rows.length} />
        <KpiCard label="Emotion Spike Index" value={Math.min(100, 56 + rows.length * 3)} />
      </KpiGrid>

      <div className="fx-action-row mb-14">
        <button className="fx-btn-ghost">Pause Campaign</button>
        <button className="fx-btn-ghost">Increase Multiplier</button>
        <button className="fx-btn-ghost">Change Creative</button>
        <button className="fx-btn-ghost">Switch Target Segment</button>
        <button className="fx-btn-ghost">Budget Reallocate %</button>
      </div>

      <SectionCard title="Revenue Trend (Spend vs Revenue vs LTV Uplift)" className="mb-14">
        <MultiLineGraph a={spendSeries} b={revenueSeries} c={upliftSeries} />
      </SectionCard>

      <div className="fx-layout-2col mb-14">
        <SectionCard title="Brand Activity Signals">
          <div className="fx-trend-grid">
            <div className="fx-trend-item"><strong>Budget Velocity</strong><MiniSparkline points={[22,20,24,21,27,26,28,25,30,32,31,35]} color="#22d3ee" /></div>
            <div className="fx-trend-item"><strong>Creative Lift</strong><MiniSparkline points={[12,14,13,16,15,18,19,17,21,20,23,22]} color="#34d399" /></div>
            <div className="fx-trend-item"><strong>Moment Heat</strong><BarBlocks values={[8,11,7,15,12,9,14,10,13,16,11,9]} /></div>
          </div>
        </SectionCard>
        <SectionCard title="Channel Distribution">
          <div className="fx-layout-2col-tight">
            <RingMetric value={Math.round(totalSpend / 240)} max={500} label="Ops Activity" color="#38bdf8" />
            <ProgressList rows={[
              { label: "Meta", value: "56%", pct: 56, color: "#38bdf8" },
              { label: "DSP", value: "34%", pct: 34, color: "#facc15" },
              { label: "In-App", value: "10%", pct: 10, color: "#34d399" },
            ]} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Allocations">
        <DataTable
          headers={["Channel", "Campaign", "Segment", "Moment", "Budget", "ROAS"]}
          rows={rows.slice(0, 12).map((x) => [x.channel, x.campaign_id, x.segment_id, x.moment, Math.round(x.allocated_budget || 0), (x.expected_roas || 0).toFixed(2)])}
          emptyText="No allocations yet."
        />
      </SectionCard>
    </div>
  );
}
