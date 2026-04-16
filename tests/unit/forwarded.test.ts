import { describe, it, expect } from "vitest";
import { parseForwardedFor, getClientIp } from "../../src/lib/forwarded";

describe("parseForwardedFor", () => {
  it("parses list", () => {
    expect(parseForwardedFor("1.1.1.1, 2.2.2.2, 3.3.3.3")).toEqual(["1.1.1.1", "2.2.2.2", "3.3.3.3"]);
  });
  it("handles empty", () => { expect(parseForwardedFor(null)).toEqual([]); });
});

describe("getClientIp", () => {
  it("returns first XFF entry", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.1.1.1, 2.2.2.2" : null) };
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    const headers = { get: (n: string) => (n === "x-real-ip" ? "9.9.9.9" : null) };
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  it("returns null when both missing", () => {
    expect(getClientIp({ get: () => null })).toBeNull();
  });
});
