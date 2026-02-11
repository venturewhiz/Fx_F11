import Link from "next/link";

const nav = [
  ["/", "Overview"],
  ["/campaigns", "Campaigns"],
  ["/creatives", "Creatives"],
  ["/integrations", "Integrations"],
  ["/rewards", "Rewards"],
  ["/settlement", "Settlement"],
  ["/reports", "Reports"]
];

export default function App({ Component, pageProps }) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", background: "#f5f7fb", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid #dce3ef", background: "#0d1b2a", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 18 }}>
          <strong>FandomX Club Console</strong>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {nav.map(([href, label]) => (
              <Link key={href} href={href} style={{ color: "#c9d7ea", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        <Component {...pageProps} />
      </main>
    </div>
  );
}
