import { useEffect, useMemo, useState } from "react";
import { API_GATEWAY_URL, ORCHESTRATOR_URL, jsonFetch } from "../lib/config";
import { DataTable, KpiCard, KpiGrid, SectionCard } from "../lib/ui/Primitives";
import { BarBlocks, MiniSparkline, ProgressList, RingMetric } from "../lib/ui/Widgets";

export default function Home() {
  const [alloc, setAlloc] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    async function load() {
      const [a, inv] = await Promise.all([
        jsonFetch(`${ORCHESTRATOR_URL}/latest/allocation`).catch(() => ({})),
        jsonFetch(`${API_GATEWAY_URL}/marketplace/inventory`).catch(() => [])
      ]);
      setAlloc(a?.payload || []);
      setInventory(Array.isArray(inv) ? inv : []);
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => {
    const totalSpend = alloc.reduce((sum, a) => sum + (a.allocated_budget || 0), 0);
    const avgRoas = alloc.length ? alloc.reduce((sum, a) => sum + (a.expected_roas || 0), 0) / alloc.length : 0;
    return { totalSpend, avgRoas };
  }, [alloc]);

  const trendA = [22, 18, 24, 16, 28, 25, 27, 20, 29, 31, 26, 35];
  const trendB = [12, 14, 10, 17, 13, 18, 21, 16, 23, 19, 26, 22];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p>Cross-property campaign control with moment-aware budget and bid updates.</p>

      <KpiGrid>
        <KpiCard label="Marketplace Properties" value={inventory.length} />
        <KpiCard label="Current Allocated Spend" value={`₹${Math.round(summary.totalSpend)}`} />
        <KpiCard label="Average Expected ROAS" value={summary.avgRoas.toFixed(2)} />
      </KpiGrid>

      <div className="fx-layout-2col mb-14">
        <SectionCard title="Brand Activity Signals">
          <div className="fx-trend-grid">
            <div className="fx-trend-item">
              <strong>Budget Velocity</strong>
              <MiniSparkline points={trendA} color="#22d3ee" />
            </div>
            <div className="fx-trend-item">
              <strong>Creative Lift</strong>
              <MiniSparkline points={trendB} color="#34d399" />
            </div>
            <div className="fx-trend-item">
              <strong>Moment Heat</strong>
              <BarBlocks values={[8, 11, 7, 15, 12, 9, 14, 10, 13, 16, 11, 9]} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Campaign Activity Mix">
          <div className="fx-layout-2col-tight">
            <RingMetric value={Math.round(summary.totalSpend / 240)} max={500} label="Ops Activity" color="#38bdf8" />
            <ProgressList
              rows={[
                { label: "Meta Delivery", value: "110,000", pct: 78, color: "#38bdf8" },
                { label: "DSP Delivery", value: "98,000", pct: 64, color: "#facc15" },
                { label: "In-App Served", value: "140,000", pct: 84, color: "#34d399" },
                { label: "Recovered", value: "67,236", pct: 48, color: "#f472b6" },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Allocations">
        <DataTable
          headers={["Channel", "Campaign", "Segment", "Moment", "Budget", "ROAS"]}
          rows={alloc.slice(0, 12).map((x) => ([
            x.channel,
            x.campaign_id,
            x.segment_id,
            x.moment,
            Math.round(x.allocated_budget || 0),
            (x.expected_roas || 0).toFixed(2),
          ]))}
          emptyText="No allocations yet."
        />
      </SectionCard>
    </div>
  );
}
