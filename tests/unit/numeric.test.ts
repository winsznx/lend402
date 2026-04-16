import { describe, it, expect } from "vitest";
import { clamp, roundTo, lerp, inverseLerp, sum, average } from "../../src/lib/numeric";

describe("clamp", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("roundTo", () => {
  it("rounds to decimals", () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.235, 2)).toBe(1.24);
  });
});

describe("lerp", () => {
  it("interpolates", () => { expect(lerp(0, 10, 0.5)).toBe(5); });
});

describe("inverseLerp", () => {
  it("inverse interpolates", () => { expect(inverseLerp(0, 10, 5)).toBe(0.5); });
});

describe("sum / average", () => {
  it("sums", () => { expect(sum([1, 2, 3])).toBe(6); });
  it("averages", () => { expect(average([2, 4, 6])).toBe(4); });
  it("empty average", () => { expect(average([])).toBe(0); });
});
