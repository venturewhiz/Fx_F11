import { useEffect, useMemo, useState } from "react";

const LS_KEY = "fx_club_rewards_cfg_v1";

const defaultRules = [
  { id: "r1", action: "watch_minutes", points: 2, cap: 100 },
  { id: "r2", action: "merch_purchase", points: 150, cap: 3000 },
];

const defaultEntitlements = [
  { id: "e1", name: "Priority Ticket Window", threshold: 2500 },
  { id: "e2", name: "Insider Live Chat", threshold: 1200 },
];

export default function Rewards() {
  const [rules, setRules] = useState(defaultRules);
  const [entitlements, setEntitlements] = useState(defaultEntitlements);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.rules)) setRules(parsed.rules);
      if (Array.isArray(parsed.entitlements)) setEntitlements(parsed.entitlements);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ rules, entitlements }));
  }, [rules, entitlements]);

  const totals = useMemo(() => {
    const earnRate = rules.reduce((sum, r) => sum + Number(r.points || 0), 0);
    const maxCap = rules.reduce((sum, r) => sum + Number(r.cap || 0), 0);
    const minUnlock = entitlements.length
      ? Math.min(...entitlements.map((e) => Number(e.threshold || 0)))
      : 0;
    return { earnRate, maxCap, minUnlock };
  }, [rules, entitlements]);

  function addRule() {
    setRules((prev) => [
      ...prev,
      { id: `r${prev.length + 1}`, action: "social_share", points: 25, cap: 500 },
    ]);
  }

  function addEntitlement() {
    setEntitlements((prev) => [
      ...prev,
      { id: `e${prev.length + 1}`, name: "Gated Video", threshold: 800 },
    ]);
  }

  function resetDefaults() {
    setRules(defaultRules);
    setEntitlements(defaultEntitlements);
  }

  function exportCsv() {
    const header = "type,id,name_or_action,points_or_threshold,cap";
    const rows = [
      ...rules.map((r) => ["rule", r.id, r.action, r.points, r.cap]),
      ...entitlements.map((e) => ["entitlement", e.id, e.name, e.threshold, ""]),
    ];
    const body = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "club_rewards_entitlements.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Rewards & Entitlements</h1>
      <p>Configure points logic, caps, and fan unlock thresholds.</p>

      <p>
        <button onClick={addRule}>Add Rule</button>
        <button onClick={addEntitlement} style={{ marginLeft: 8 }}>Add Entitlement</button>
        <button onClick={resetDefaults} style={{ marginLeft: 8 }}>Reset Defaults</button>
        <button onClick={exportCsv} style={{ marginLeft: 8 }}>Export CSV</button>
      </p>

      <p>
        <strong>Total Earn Rate:</strong> {totals.earnRate} pts &nbsp;|&nbsp;
        <strong>Total Daily Cap:</strong> {totals.maxCap} pts &nbsp;|&nbsp;
        <strong>First Unlock:</strong> {totals.minUnlock} pts
      </p>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0 }}>Points Rules</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", marginTop: 10 }}>
          <thead><tr><th>ID</th><th>Action</th><th>Points</th><th>Cap</th></tr></thead>
          <tbody>{rules.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.action}</td><td>{r.points}</td><td>{r.cap}</td></tr>)}</tbody>
        </table>
      </section>

      <section style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Entitlements</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", borderColor: "#dce3ef", marginTop: 10 }}>
          <thead><tr><th>ID</th><th>Name</th><th>Points Threshold</th></tr></thead>
          <tbody>{entitlements.map((e) => <tr key={e.id}><td>{e.id}</td><td>{e.name}</td><td>{e.threshold}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
