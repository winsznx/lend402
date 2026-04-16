export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function tryJsonParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(flattenKeys(value)).sort());
}

function flattenKeys(value: unknown, acc: Record<string, true> = {}): Record<string, true> {
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      acc[k] = true;
      flattenKeys(v, acc);
    }
  }
  return acc;
}
