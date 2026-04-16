import { describe, it, expect } from "vitest";
import { safeBps, formatBps, addBps, subtractBps } from "../../src/lib/bps";

describe("safeBps", () => {
  it("clamps to max", () => { expect(safeBps(20000)).toBe(10000); });
  it("floors negatives", () => { expect(safeBps(-5)).toBe(0); });
  it("rejects NaN", () => { expect(safeBps(NaN)).toBe(0); });
});

describe("formatBps", () => {
  it("formats", () => {
    expect(formatBps(30)).toBe("0.30%");
    expect(formatBps(15000)).toBe("150.00%");
  });
});

describe("addBps / subtractBps", () => {
  it("adds bps", () => { expect(addBps(1_000_000, 30)).toBe(1_003_000); });
  it("subtracts bps", () => { expect(subtractBps(1_000_000, 30)).toBe(997_000); });
});
