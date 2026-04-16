import { describe, it, expect } from "vitest";
import { chunk, range, zip, partition, last, compact } from "../../src/lib/array";

describe("chunk", () => {
  it("chunks by size", () => { expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]); });
});

describe("range", () => {
  it("produces ranges", () => { expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]); });
  it("reverse range", () => { expect(range(3, 0, -1)).toEqual([3, 2, 1]); });
});

describe("zip", () => {
  it("zips arrays", () => { expect(zip([1, 2], ["a", "b"])).toEqual([[1, "a"], [2, "b"]]); });
});

describe("partition", () => {
  it("partitions", () => {
    const [even, odd] = partition([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(even).toEqual([2, 4]);
    expect(odd).toEqual([1, 3]);
  });
});

describe("last", () => {
  it("returns last", () => { expect(last([1, 2, 3])).toBe(3); });
  it("returns undefined for empty", () => { expect(last([])).toBeUndefined(); });
});

describe("compact", () => {
  it("removes falsy", () => { expect(compact([1, null, 2, undefined, 0, 3])).toEqual([1, 2, 3]); });
});
