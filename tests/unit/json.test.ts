import { describe, it, expect } from "vitest";
import { safeJsonParse, tryJsonParse } from "../../src/lib/json";

describe("safeJsonParse", () => {
  it("parses valid JSON", () => { expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 }); });
  it("returns fallback on invalid", () => { expect(safeJsonParse("bad", "fb")).toBe("fb"); });
});

describe("tryJsonParse", () => {
  it("returns null on invalid", () => { expect(tryJsonParse("bad")).toBeNull(); });
  it("parses valid", () => { expect(tryJsonParse<number[]>("[1,2]")).toEqual([1, 2]); });
});
