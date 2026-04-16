import { describe, it, expect } from "vitest";
import { assertX402Version, isValidX402Version } from "../../src/lib/x402-version";

describe("isValidX402Version", () => {
  it("accepts 2", () => { expect(isValidX402Version(2)).toBe(true); });
  it("rejects other", () => { expect(isValidX402Version(1)).toBe(false); });
});

describe("assertX402Version", () => {
  it("passes for 2", () => { expect(() => assertX402Version(2)).not.toThrow(); });
  it("throws for other", () => { expect(() => assertX402Version(1)).toThrow(); });
});
