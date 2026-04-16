export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return "";
  const qs = entries
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v)))
    .join("&");
  return "?" + qs;
}

export function parseQueryString(search: string): Record<string, string> {
  const clean = search.startsWith("?") ? search.slice(1) : search;
  const result: Record<string, string> = {};
  if (!clean) return result;
  for (const pair of clean.split("&")) {
    const [k, v = ""] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return result;
}
