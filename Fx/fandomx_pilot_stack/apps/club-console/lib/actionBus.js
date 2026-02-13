export function logAction(key, action) {
  const k = `fx_actions_${key}`;
  const prev = JSON.parse(localStorage.getItem(k) || "[]");
  const next = [{ ts: new Date().toISOString(), ...action }, ...prev].slice(0, 50);
  localStorage.setItem(k, JSON.stringify(next));
  return next;
}
export function getActions(key) {
  return JSON.parse(localStorage.getItem(`fx_actions_${key}`) || "[]");
}
