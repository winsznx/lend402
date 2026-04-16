export function parseForwardedFor(headerValue: string | null): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function getClientIp(headers: { get(name: string): string | null }): string | null {
  const xff = parseForwardedFor(headers.get("x-forwarded-for"));
  if (xff.length > 0) return xff[0];
  return headers.get("x-real-ip")?.trim() || null;
}
