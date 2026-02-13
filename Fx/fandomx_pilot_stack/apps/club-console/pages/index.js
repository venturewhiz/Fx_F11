import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, KpiCard, KpiGrid, SectionCard } from "../lib/ui/Primitives";
import { BarBlocks, MiniSparkline, ProgressList, RingMetric } from "../lib/ui/Widgets";

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [bids, setBids] = useState([]);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [a, b, t] = await Promise.all([
          jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
          jsonFetch(`${ORCHESTRATOR_URL}/latest/bids`).catch(() => ({})),
          jsonFetch(`${API_GATEWAY_URL}/tenants`).catch(() => [])
        ]);
        setAlloc(a?.payload || []);
        setBids(b?.payload || []);
        setTenants(Array.isArray(t) ? t : []);
      } catch (_) {}
    }
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  const kpis = useMemo(() => {
    const spend = alloc.reduce((s, x) => s + (x.allocated_budget || 0), 0);
    const avgRoas = alloc.length ? alloc.reduce((s, x) => s + (x.expected_roas || 0), 0) / alloc.length : 0;
    const avgAcos = alloc.length ? alloc.reduce((s, x) => s + (x.expected_acos || 0), 0) / alloc.length : 0;
    return { spend, avgRoas, avgAcos };
  }, [alloc]);

  const fanPulse = [14, 16, 13, 19, 24, 20, 23, 21, 27, 18, 22, 26];
  const commercePulse = [8, 12, 10, 13, 9, 14, 16, 12, 18, 15, 17, 19];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p style={{ marginTop: -6, color: "#425066" }}>Live fan-moment pulse, active allocation outputs, and tenant readiness.</p>

      <KpiGrid>
        <KpiCard label="Total Allocated Budget" value={`₹${Math.round(kpis.spend)}`} />
        <KpiCard label="Average Expected ROAS" value={kpis.avgRoas.toFixed(2)} />
        <KpiCard label="Average Expected ACOS" value={kpis.avgAcos.toFixed(3)} />
        <KpiCard label="Active Bids" value={bids.length} />
      </KpiGrid>

      <div className="fx-layout-2col mb-14">
        <SectionCard title="Matchday Operating Pulse">
          <div className="fx-trend-grid">
            <div className="fx-trend-item">
              <strong>Fan Emotion Velocity</strong>
              <MiniSparkline points={fanPulse} color="#a78bfa" />
            </div>
            <div className="fx-trend-item">
              <strong>Commerce Conversion Pulse</strong>
              <MiniSparkline points={commercePulse} color="#22d3ee" />
            </div>
            <div className="fx-trend-item">
              <strong>FML Momentum</strong>
              <BarBlocks values={[9, 12, 10, 8, 14, 16, 12, 11, 17, 14, 13, 15]} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Fan Connect Index">
          <div className="fx-layout-2col-tight">
            <RingMetric value={Math.round(kpis.avgRoas * 180)} max={400} label="Connect Score" color="#34d399" />
            <ProgressList
              rows={[
                { label: "Hardcore Fans", value: "68%", pct: 68, color: "#38bdf8" },
                { label: "Casual Fans", value: "44%", pct: 44, color: "#a78bfa" },
                { label: "Merch Buyers", value: "39%", pct: 39, color: "#facc15" },
                { label: "Ticket Intent", value: "52%", pct: 52, color: "#34d399" },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tenant Readiness">
        <DataTable
          headers={["Tenant", "Type", "Integrations", "Created"]}
          rows={tenants.map((t) => ([
            t.name || t.tenant_id,
            t.type,
            Object.keys(t.integrations || {}).length,
            t.created_at || "-",
          ]))}
          emptyText="No tenants created yet."
        />
      </SectionCard>

      <SectionCard title="Latest Allocations" className="mt-14">
        <DataTable
          headers={["Channel", "Campaign", "Segment", "Moment", "Creative", "Offer", "Budget", "ROAS"]}
          rows={alloc.slice(0, 12).map((x) => ([
            x.channel,
            x.campaign_id,
            x.segment_id,
            x.moment,
            x.creative_id,
            x.offer_id,
            Math.round(x.allocated_budget || 0),
            (x.expected_roas || 0).toFixed(2),
          ]))}
          emptyText="No optimization output yet. Trigger a moment event first."
        />
      </SectionCard>
    </div>
  );
}
