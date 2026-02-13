import Link from "next/link";

export default function AppShell({
  shellClass = "",
  title = "FandomX",
  subtitle = "",
  stripItems = [],
  nav = [],
  children,
  footerSlot = null,
}) {
  return (
    <div className={`fx-shell ${shellClass}`.trim()}>
      <div className="fx-app-grid">
        <aside className="fx-sidebar">
          <div className="fx-sidebar-head">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <nav className="fx-sidebar-nav">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="fx-sidebar-link">
                {label}
              </Link>
            ))}
          </nav>
          <div className="fx-sidebar-help">
            <div>Need setup help?</div>
            <small>Run onboarding and connect plugins first.</small>
          </div>
        </aside>

        <div className="fx-content">
          <header className="fx-topbar">
            <div className="fx-topbar-left">
              <span className="fx-breadcrumb">Home</span>
              <span className="fx-bullet">•</span>
              <span className="fx-breadcrumb">Dashboard</span>
            </div>
            <div className="fx-topbar-right">
              <span className="fx-pill">Live</span>
              <span className="fx-pill">Prod</span>
            </div>
          </header>
          <div className="fx-match-strip">
            {stripItems.map((item, idx) => (
              <span key={`${item}-${idx}`}>{item}</span>
            ))}
          </div>
          <main className="fx-main">
            {children}
          </main>
          {footerSlot}
        </div>
      </div>
    </div>
  );
}
