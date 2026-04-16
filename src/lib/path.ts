export function joinPath(...segments: Array<string | undefined | null>): string {
  return segments
    .filter((s): s is string => Boolean(s))
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
    .filter((s) => s.length > 0)
    .join("/");
}

export function normalizePath(path: string): string {
  return "/" + path.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

export function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}
