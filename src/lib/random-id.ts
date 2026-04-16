import { randomBytes } from "crypto";

export function generateRandomId(bytes: number = 16): string {
  return randomBytes(bytes).toString("hex");
}

export function generateShortId(): string {
  return randomBytes(6).toString("base64url");
}
