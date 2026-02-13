function pointsToPath(points, width, height, pad = 6) {
  if (!points.length) return "";
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const stepX = (width - pad * 2) / Math.max(1, points.length - 1);
  return points
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function MiniSparkline({ points = [], color = "#4cc9f0", height = 44 }) {
  const width = 180;
  const d = pointsToPath(points, width, height);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="fx-sparkline">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function RingMetric({ value = 0, max = 100, label = "Activity", color = "#4cc9f0" }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="fx-ring-wrap">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} className="fx-ring-bg" />
        <circle
          cx="66"
          cy="66"
          r={r}
          className="fx-ring-fg"
          style={{ stroke: color, strokeDasharray: `${dash} ${c - dash}` }}
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div className="fx-ring-center">
        <strong>{Math.round(value)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ProgressList({ rows = [] }) {
  return (
    <div className="fx-progress-list">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="fx-progress-row">
          <div className="fx-progress-labels">
            <span>{r.label}</span>
            <span>{r.value}</span>
          </div>
          <div className="fx-progress-track">
            <div className="fx-progress-fill" style={{ width: `${Math.max(0, Math.min(100, r.pct || 0))}%`, background: r.color || "#4cc9f0" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarBlocks({ values = [] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="fx-barblocks">
      {values.map((v, i) => (
        <div key={i} className="fx-barblock-col">
          <div className="fx-barblock" style={{ height: `${Math.max(8, (v / max) * 130)}px` }} />
        </div>
      ))}
    </div>
  );
}
