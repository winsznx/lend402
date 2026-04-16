import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvLine, toCsv } from "../../src/lib/csv";

describe("parseCsvLine", () => {
  it("splits simple fields", () => { expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]); });
  it("handles quoted fields", () => { expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]); });
  it("handles escaped quotes", () => { expect(parseCsvLine('"he said ""hi"""')).toEqual(['he said "hi"']); });
});

describe("parseCsv", () => {
  it("parses multi-line", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
});

describe("toCsv", () => {
  it("serializes", () => { expect(toCsv([["a", "b"], ["1", "2"]])).toBe("a,b\n1,2"); });
  it("quotes fields with commas", () => { expect(toCsv([["a,b", "c"]])).toBe('"a,b",c'); });
});
