import { describe, it, expect } from "vitest";
import { serializeCookie, parseCookie } from "../../src/lib/cookies";

describe("serializeCookie", () => {
  it("defaults to Secure, HttpOnly, SameSite=Lax", () => {
    const str = serializeCookie("sid", "abc");
    expect(str).toContain("Secure");
    expect(str).toContain("HttpOnly");
    expect(str).toContain("SameSite=Lax");
  });

  it("supports Max-Age", () => {
    expect(serializeCookie("sid", "abc", { maxAgeSeconds: 60 })).toContain("Max-Age=60");
  });

  it("encodes value", () => {
    expect(serializeCookie("x", "a=b c")).toContain("x=a%3Db%20c");
  });
});

describe("parseCookie", () => {
  it("parses multiple values", () => {
    expect(parseCookie("a=1; b=2; c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("decodes values", () => {
    expect(parseCookie("x=a%3Db%20c")).toEqual({ x: "a=b c" });
  });
});
