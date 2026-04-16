import { describe, it, expect } from "vitest";
import { secondsAgo, toIsoString, toUnix, addSeconds, isExpired } from "../../src/lib/date";

describe("secondsAgo", () => {
  it("returns positive for past", () => {
    expect(secondsAgo(Math.floor(Date.now() / 1000) - 30)).toBeGreaterThanOrEqual(30);
  });
});

describe("toIsoString", () => {
  it("converts unix seconds", () => {
    expect(toIsoString(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});

describe("toUnix", () => {
  it("handles number", () => { expect(toUnix(1000)).toBe(1000); });
  it("handles Date", () => { expect(toUnix(new Date(0))).toBe(0); });
  it("handles ISO string", () => { expect(toUnix("1970-01-01T00:00:00Z")).toBe(0); });
});

describe("addSeconds", () => {
  it("adds", () => { expect(addSeconds(100, 50)).toBe(150); });
});

describe("isExpired", () => {
  it("detects expired", () => { expect(isExpired(0)).toBe(true); });
  it("detects future", () => { expect(isExpired(Math.floor(Date.now() / 1000) + 3600)).toBe(false); });
});
