import { describe, it, expect } from "vitest";
import { parseBearerToken, timingSafeStringCompare } from "../../src/lib/bearer";

describe("parseBearerToken", () => {
  it("parses token", () => { expect(parseBearerToken("Bearer abc.def")).toBe("abc.def"); });
  it("case insensitive", () => { expect(parseBearerToken("bearer xyz")).toBe("xyz"); });
  it("returns null for null", () => { expect(parseBearerToken(null)).toBeNull(); });
  it("returns null for non-Bearer", () => { expect(parseBearerToken("Basic abc")).toBeNull(); });
});

describe("timingSafeStringCompare", () => {
  it("matches equal", () => { expect(timingSafeStringCompare("abc", "abc")).toBe(true); });
  it("rejects different", () => { expect(timingSafeStringCompare("abc", "abd")).toBe(false); });
  it("rejects length mismatch", () => { expect(timingSafeStringCompare("abc", "abcd")).toBe(false); });
});
