import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, KpiCard, KpiGrid, SectionCard } from "../lib/ui/Primitives";
import { BarBlocks, MiniSparkline, ProgressList, RingMetric } from "../lib/ui/Widgets";

const DEMO_ALLOC = [
  { channel: "meta", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", creative_id: "cr_upbeat", offer_id: "off_merch", allocated_budget: 30000, expected_roas: 1.93, expected_acos: 0.0 },
  { channel: "meta", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", creative_id: "cr_consoling", offer_id: "off_merch", allocated_budget: 30000, expected_roas: 2.06, expected_acos: 0.0 },
  { channel: "dsp", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", creative_id: "cr_consoling", offer_id: "off_merch", allocated_budget: 30000, expected_roas: 1.68, expected_acos: 0.0 },
  { channel: "dsp", campaign_id: "camp_1", segment_id: "seg_hardcore", moment: "team_success", creative_id: "cr_upbeat", offer_id: "off_merch", allocated_budget: 8400, expected_roas: 1.58, expected_acos: 0.0 },
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
      <path d={path(a)} fill="none" stroke="#2563eb" strokeWidth="2.5" />
      <path d={path(b)} fill="none" stroke="#64748b" strokeWidth="2.5" />
      <path d={path(c)} fill="none" stroke="#16a34a" strokeWidth="2.5" />
    </svg>
  );
}

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [bids, setBids] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    async function load() {
      const [a, b, t] = await Promise.all([
        jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
        jsonFetch(`${ORCHESTRATOR_URL}/latest/bids`).catch(() => ({})),
        jsonFetch(`${API_GATEWAY_URL}/tenants`).catch(() => []),
      ]);
      setAlloc(a?.payload || []);
      setBids(b?.payload || []);
      setTenants(Array.isArray(t) ? t : []);
    }
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  const rows = alloc.length ? alloc : DEMO_ALLOC;
  const spend = rows.reduce((s, x) => s + (x.allocated_budget || 0), 0);
  const avgRoas = rows.length ? rows.reduce((s, x) => s + (x.expected_roas || 0), 0) / rows.length : 0;
  const avgAcos = rows.length ? rows.reduce((s, x) => s + (x.expected_acos || 0), 0) / rows.length : 0;

  const todayRevenue = Math.round(spend * 1.12);
  const matchdayRevenue = Math.round(spend * 1.36);
  const sponsorRevenue = Math.round(spend * 0.52);
  const rightsRevenue = Math.round(spend * 0.33);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Executive Revenue Command Center</h1>
      <p style={{ marginTop: -6, color: "#425066" }}>Inventory yield, rights control, and fan monetization at match speed.</p>

      <KpiGrid>
        <KpiCard label="Today Revenue" value={`₹${todayRevenue.toLocaleString()}`} />
        <KpiCard label="Matchday Revenue" value={`₹${matchdayRevenue.toLocaleString()}`} />
        <KpiCard label="Sponsor Revenue" value={`₹${sponsorRevenue.toLocaleString()}`} />
        <KpiCard label="Yield (eCPM)" value={(avgRoas * 84).toFixed(1)} />
        <KpiCard label="Fill Rate" value={`${Math.min(98, 62 + Math.round(avgRoas * 8))}%`} />
        <KpiCard label="Rights Layer Revenue" value={`₹${rightsRevenue.toLocaleString()}`} />
      </KpiGrid>

      <div className="fx-action-row mb-14">
        <button className="fx-btn-ghost">Enable Premium Mode</button>
        <button className="fx-btn-ghost">Adjust Floor Price</button>
        <button className="fx-btn-ghost">View Sponsor Impact Report</button>
      </div>

      <SectionCard title="Revenue vs Previous Match / Yield vs Emotion" className="mb-14">
        <MultiLineGraph
          a={[42,47,44,49,53,51,56,60,57,63,67,71]}
          b={[38,40,41,43,45,46,47,49,50,53,55,57]}
          c={[55,58,54,61,64,62,68,72,69,74,77,81]}
        />
      </SectionCard>

      <div className="fx-layout-2col mb-14">
        <SectionCard title="Matchday Operating Pulse">
          <div className="fx-trend-grid">
            <div className="fx-trend-item"><strong>Fan Emotion Velocity</strong><MiniSparkline points={[14,16,13,19,24,20,23,21,27,18,22,26]} color="#a78bfa" /></div>
            <div className="fx-trend-item"><strong>Commerce Conversion Pulse</strong><MiniSparkline points={[8,12,10,13,9,14,16,12,18,15,17,19]} color="#22d3ee" /></div>
            <div className="fx-trend-item"><strong>FML Momentum</strong><BarBlocks values={[9,12,10,8,14,16,12,11,17,14,13,15]} /></div>
          </div>
        </SectionCard>
        <SectionCard title="Fan Connect Index">
          <div className="fx-layout-2col-tight">
            <RingMetric value={Math.round(avgRoas * 180)} max={400} label="Connect Score" color="#34d399" />
            <ProgressList rows={[
              { label: "Hardcore Fans", value: "68%", pct: 68, color: "#38bdf8" },
              { label: "Casual Fans", value: "44%", pct: 44, color: "#a78bfa" },
              { label: "Merch Buyers", value: "39%", pct: 39, color: "#facc15" },
              { label: "Ticket Intent", value: "52%", pct: 52, color: "#34d399" },
            ]} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tenant Readiness">
        <DataTable
          headers={["Tenant", "Type", "Integrations", "Created"]}
          rows={(tenants || []).map((t) => [t.name || t.tenant_id, t.type, Object.keys(t.integrations || {}).length, t.created_at || "-"])}
          emptyText="No tenants created yet."
        />
      </SectionCard>

      <SectionCard title="Latest Allocations" className="mt-14">
        <DataTable
          headers={["Channel", "Campaign", "Segment", "Moment", "Creative", "Offer", "Budget", "ROAS"]}
          rows={rows.slice(0, 12).map((x) => [x.channel, x.campaign_id, x.segment_id, x.moment, x.creative_id, x.offer_id, Math.round(x.allocated_budget || 0), (x.expected_roas || 0).toFixed(2)])}
          emptyText="No optimization output yet. Trigger a moment event first."
        />
      </SectionCard>
    </div>
  );
}
