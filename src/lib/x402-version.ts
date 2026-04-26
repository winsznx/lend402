import { X402_VERSION } from "@/lib/protocol";

export function assertX402Version(version: unknown): asserts version is 2 {
  if (version !== X402_VERSION) {
    throw new Error("Unsupported x402 version: " + String(version));
  }
}

export function isValidX402Version(version: unknown): version is 2 {
  return version === X402_VERSION;
}
