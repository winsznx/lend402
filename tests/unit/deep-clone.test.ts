import { describe, it, expect } from "vitest";
import { deepClone } from "../../src/lib/deep-clone";

describe("deepClone", () => {
  it("clones primitives", () => { expect(deepClone(42)).toBe(42); });
  it("clones arrays", () => {
    const arr = [1, 2, 3];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });
  it("clones nested objects", () => {
    const obj = { a: { b: [1, 2] } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned.a).not.toBe(obj.a);
  });
});
