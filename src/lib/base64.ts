export function encodeBase64(data: string): string {
  return Buffer.from(data, "utf8").toString("base64");
}

export function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf8");
}

export function encodeBase64Json<T>(payload: T): string {
  return encodeBase64(JSON.stringify(payload));
}

export function decodeBase64Json<T>(encoded: string): T {
  return JSON.parse(decodeBase64(encoded)) as T;
}
