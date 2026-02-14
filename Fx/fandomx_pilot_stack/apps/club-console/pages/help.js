import Link from "next/link";

const checks = [
  "Club UI running on port 3001",
  "Orchestrator running on port 8090",
  "Live Moments agent running on port 8004",
  "Optimizer running on port 8000",
  "Postgres reachable on port 5432",
];

const quickLinks = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/integrations", label: "Integrations" },
  { href: "/channels", label: "Channel Yield" },
  { href: "/settlement", label: "Settlement" },
  { href: "/reports", label: "Reports" },
];

export default function HelpPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Help</h1>
      <p>Runbook for setup, health checks, and common recovery actions.</p>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Startup Checklist</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {checks.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Quick Commands</h2>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`bash scripts/run_all_codespaces.sh
curl -i http://localhost:8004/health
curl -i http://localhost:8090/latest/allocation
curl -i http://localhost:8000/health
docker compose up -d postgres`}
        </pre>
      </section>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Quick Navigation</h2>
        <p>
          {quickLinks.map((l, i) => (
            <span key={l.href}>
              <Link href={l.href}>{l.label}</Link>
              {i < quickLinks.length - 1 ? " | " : ""}
            </span>
          ))}
        </p>
      </section>
    </div>
  );
}
