export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM: "application/x-www-form-urlencoded",
  MULTIPART: "multipart/form-data",
  TEXT: "text/plain",
  HTML: "text/html",
  OCTET: "application/octet-stream",
  SSE: "text/event-stream",
} as const;

export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().split(";")[0].trim() === CONTENT_TYPES.JSON;
}

export function isFormContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const base = contentType.toLowerCase().split(";")[0].trim();
  return base === CONTENT_TYPES.FORM || base === CONTENT_TYPES.MULTIPART;
}
