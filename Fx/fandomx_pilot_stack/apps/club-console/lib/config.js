export const API_GATEWAY_URL = "https://redesigned-space-spoon-xp7vrxgpvh96wr-8080.app.github.dev";
export const ORCHESTRATOR_URL = "https://redesigned-space-spoon-xp7vrxgpvh96wr-8090.app.github.dev";

export async function jsonFetch(url, options = {}) {
  const res = await fetch(url, { ...options, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
