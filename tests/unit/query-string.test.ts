import { describe, it, expect } from "vitest";
import { buildQueryString, parseQueryString } from "../../src/lib/query-string";

describe("buildQueryString", () => {
  it("returns empty when no params", () => { expect(buildQueryString({})).toBe(""); });
  it("skips null/undefined", () => {
    expect(buildQueryString({ a: 1, b: null, c: undefined })).toBe("?a=1");
  });
  it("encodes values", () => {
    expect(buildQueryString({ q: "a b" })).toBe("?q=a%20b");
  });
});

describe("parseQueryString", () => {
  it("parses simple", () => { expect(parseQueryString("?a=1&b=2")).toEqual({ a: "1", b: "2" }); });
  it("decodes values", () => { expect(parseQueryString("?q=a%20b")).toEqual({ q: "a b" }); });
});
