import { describe, it, expect } from "vitest";
import { pick, omit, mapValues, isEmptyObject } from "../../src/lib/object";

describe("pick", () => {
  it("picks keys", () => { expect(pick({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 }); });
});

describe("omit", () => {
  it("omits keys", () => { expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 }); });
});

describe("mapValues", () => {
  it("maps values", () => {
    expect(mapValues({ a: 1, b: 2 }, (v) => v * 2)).toEqual({ a: 2, b: 4 });
  });
});

describe("isEmptyObject", () => {
  it("detects empty", () => { expect(isEmptyObject({})).toBe(true); });
  it("detects non-empty", () => { expect(isEmptyObject({ a: 1 })).toBe(false); });
});
