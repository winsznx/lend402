import { describe, it, expect } from "vitest";
import { deepEqual } from "../../src/lib/deep-equal";

describe("deepEqual", () => {
  it("primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
  });
  it("arrays", () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
  });
  it("nested objects", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });
  it("nulls", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
  });
});
