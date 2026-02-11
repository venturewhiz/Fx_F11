import { useState } from "react";

export default function Safety() {
  const [rules, setRules] = useState([
    { id: "s1", rule: "Suppress hype creatives during injury events", status: "active" },
    { id: "s2", rule: "Block targeting for negative sentiment clusters", status: "active" },
    { id: "s3", rule: "Frequency cap <= 3 per fan per match", status: "active" }
  ]);

  function toggle(idx) {
    setRules(rules.map((r, i) => (i === idx ? { ...r, status: r.status === "active" ? "paused" : "active" } : r)));
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Brand Safety & Compliance</h1>
      <p>Define tone restrictions, suppression rules, and pacing guardrails for live contexts.</p>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#e4dbc6", background: "#fff" }}>
        <thead><tr><th>ID</th><th>Rule</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={r.id}>
              <td>{r.id}</td><td>{r.rule}</td><td>{r.status}</td><td><button onClick={() => toggle(i)}>Toggle</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
