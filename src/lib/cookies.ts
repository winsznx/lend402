export function serializeCookie(
  name: string,
  value: string,
  options: { maxAgeSeconds?: number; secure?: boolean; httpOnly?: boolean; sameSite?: "Strict" | "Lax" | "None"; path?: string } = {}
): string {
  const parts = [name + "=" + encodeURIComponent(value)];
  if (options.maxAgeSeconds !== undefined) parts.push("Max-Age=" + options.maxAgeSeconds);
  parts.push("Path=" + (options.path ?? "/"));
  if (options.secure !== false) parts.push("Secure");
  if (options.httpOnly !== false) parts.push("HttpOnly");
  parts.push("SameSite=" + (options.sameSite ?? "Lax"));
  return parts.join("; ");
}

export function parseCookie(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (k && rest.length > 0) {
      result[k] = decodeURIComponent(rest.join("="));
    }
  });
  return result;
}
