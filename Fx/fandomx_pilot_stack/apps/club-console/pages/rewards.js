import { useState } from "react";

export default function Rewards() {
  const [rules, setRules] = useState([
    { id: "r1", action: "watch_minutes", points: 2, cap: 100 },
    { id: "r2", action: "merch_purchase", points: 150, cap: 3000 }
  ]);
  const [entitlements, setEntitlements] = useState([
    { id: "e1", name: "Priority Ticket Window", threshold: 2500 },
    { id: "e2", name: "Insider Live Chat", threshold: 1200 }
  ]);

  function addRule() {
    setRules([...rules, { id: `r${rules.length + 1}`, action: "social_share", points: 25, cap: 500 }]);
  }

  function addEntitlement() {
    setEntitlements([...entitlements, { id: `e${entitlements.length + 1}`, name: "Gated Video", threshold: 800 }]);
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Rewards & Entitlements</h1>
      <p>Backend plugin configuration for earn rules, caps, and token-gated privileges.</p>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Points Rules</h2>
        <button onClick={addRule}>Add Rule</button>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", marginTop: 10 }}>
          <thead><tr><th>ID</th><th>Action</th><th>Points</th><th>Cap</th></tr></thead>
          <tbody>{rules.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.action}</td><td>{r.points}</td><td>{r.cap}</td></tr>)}</tbody>
        </table>
      </section>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Entitlements</h2>
        <button onClick={addEntitlement}>Add Entitlement</button>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", marginTop: 10 }}>
          <thead><tr><th>ID</th><th>Name</th><th>Points Threshold</th></tr></thead>
          <tbody>{entitlements.map((e) => <tr key={e.id}><td>{e.id}</td><td>{e.name}</td><td>{e.threshold}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
