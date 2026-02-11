import Link from "next/link";

const nav = [
  ["/", "Overview"],
  ["/marketplace", "Marketplace"],
  ["/campaigns", "Campaign Builder"],
  ["/optimization", "Optimization"],
  ["/settlement", "Settlement"],
  ["/safety", "Safety"],
  ["/reports", "Reports"]
];

export default function App({ Component, pageProps }) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", background: "#f7f6f2", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid #e4dbc6", background: "#1f2937", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 18 }}>
          <strong>FandomX Brand Console</strong>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {nav.map(([href, label]) => (
              <Link key={href} href={href} style={{ color: "#d9e1ee", textDecoration: "none" }}>
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
