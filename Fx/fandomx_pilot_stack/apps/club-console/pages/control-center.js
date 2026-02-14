import Link from "next/link";
import { useMemo } from "react";
import { SectionCard } from "../lib/ui/Primitives";

const tiles = [
  { href: "/campaigns", title: "Sponsor Value", desc: "Create and monitor sponsor campaigns." },
  { href: "/channels", title: "Channel Yield", desc: "Tune rights controls and channel mix." },
  { href: "/segments", title: "Fan Segments", desc: "Adjust segment boosts and suppression." },
  { href: "/creatives", title: "Creatives", desc: "Manage creative and offer catalog." },
  { href: "/integrations", title: "Integrations", desc: "Connect CDP, ticketing, and live feeds." },
  { href: "/settlement", title: "Settlement", desc: "Run daily split and export CSV." },
  { href: "/reports", title: "Reports", desc: "Review moment and ROI outcomes." },
  { href: "/rewards", title: "Rewards", desc: "Configure loyalty and entitlements." },
];

export default function ClubControlCenter() {
  const stats = useMemo(
    () => [
      ["Active Modules", String(tiles.length)],
      ["Environment", "Local / Codespaces"],
      ["Data Mode", "Live + Fallback"],
    ],
    []
  );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Control Center</h1>
      <p>Operational shortcuts for matchday workflows.</p>

      <SectionCard title="Quick Status" className="mb-14">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(160px,1fr))", gap: 10 }}>
          {stats.map(([k, v]) => (
            <div key={k} style={{ border: "1px solid #dce3ef", borderRadius: 10, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{k}</div>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Module Shortcuts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              style={{
                display: "block",
                border: "1px solid #dce3ef",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <strong>{t.title}</strong>
              <p style={{ margin: "8px 0 0 0", opacity: 0.85 }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
