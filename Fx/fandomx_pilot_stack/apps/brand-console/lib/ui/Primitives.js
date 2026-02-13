export function SectionCard({ title, children, className = "", compact = false }) {
  return (
    <section className={`fx-card ${compact ? "fx-card-compact" : ""} ${className}`.trim()}>
      {title ? <h2 className="fx-card-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function KpiGrid({ children }) {
  return <section className="fx-kpi-grid">{children}</section>;
}

export function KpiCard({ label, value, sub = "" }) {
  return (
    <div className="fx-card fx-kpi-card">
      <strong className="fx-kpi-label">{label}</strong>
      <div className="fx-kpi-value">{value}</div>
      {sub ? <div className="fx-kpi-sub">{sub}</div> : null}
    </div>
  );
}

export function DataTable({ headers = [], rows = [], emptyText = "No data yet." }) {
  return (
    <table className="fx-table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length
          ? rows.map((cells, idx) => (
              <tr key={idx}>
                {cells.map((c, cIdx) => (
                  <td key={`${idx}-${cIdx}`}>{c}</td>
                ))}
              </tr>
            ))
          : (
            <tr>
              <td colSpan={headers.length || 1}>{emptyText}</td>
            </tr>
          )}
      </tbody>
    </table>
  );
}
