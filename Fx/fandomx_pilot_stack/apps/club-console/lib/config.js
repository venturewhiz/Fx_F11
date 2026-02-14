function resolvePortBase(port) {
  if (typeof window === "undefined") return `http://localhost:${port}`;
  const { protocol, hostname } = window.location;
  if (hostname.endsWith(".app.github.dev")) {
    return `${protocol}//${hostname.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`)}`;
  }
  return `http://localhost:${port}`;
}

export const API_GATEWAY_URL = resolvePortBase(8080);
export const ORCHESTRATOR_URL = resolvePortBase(8090);

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
