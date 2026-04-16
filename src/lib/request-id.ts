import { randomUUID } from "crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function getOrGenerateRequestId(
  headers: { get(name: string): string | null }
): string {
  const existing = headers.get(REQUEST_ID_HEADER)?.trim();
  if (existing && existing.length <= 128) return existing;
  return randomUUID();
}
