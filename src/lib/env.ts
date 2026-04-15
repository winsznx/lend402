export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Missing required environment variable: " + name);
  return value;
}

export function optionalEnv(name: string, fallback: string = ""): string {
  return process.env[name]?.trim() || fallback;
}

export function numericEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function booleanEnv(name: string, fallback: boolean = false): boolean {
  const raw = process.env[name]?.trim()?.toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}
