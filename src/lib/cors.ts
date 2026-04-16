interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function buildCorsHeaders(requestOrigin: string | null, options: CorsOptions = {}): Record<string, string> {
  const { origin, methods = ["GET", "POST", "OPTIONS"], headers = ["Content-Type", "Authorization"], credentials = false, maxAge = 86400 } = options;

  const allowOrigin = resolveOrigin(requestOrigin, origin);
  const result: Record<string, string> = {
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
    "Access-Control-Max-Age": String(maxAge),
  };
  if (allowOrigin) result["Access-Control-Allow-Origin"] = allowOrigin;
  if (credentials) result["Access-Control-Allow-Credentials"] = "true";
  return result;
}

function resolveOrigin(requestOrigin: string | null, allowed?: string | string[]): string | null {
  if (!allowed) return "*";
  if (allowed === "*") return "*";
  if (!requestOrigin) return null;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(requestOrigin) ? requestOrigin : null;
}
