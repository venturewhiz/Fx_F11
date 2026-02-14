export const API_GATEWAY_URL = "";
export const ORCHESTRATOR_URL = "";

export async function jsonFetch(url, options = {}) {
  const resolved =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `${window.location.origin}${url}`;
  const res = await fetch(resolved, { ...options, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
