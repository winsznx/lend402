import { describe, it, expect } from "vitest";
import { joinPath, normalizePath, splitPath } from "../../src/lib/path";

describe("joinPath", () => {
  it("joins parts", () => { expect(joinPath("a", "b", "c")).toBe("a/b/c"); });
  it("strips extra slashes", () => { expect(joinPath("a/", "/b/", "/c")).toBe("a/b/c"); });
  it("handles empty", () => { expect(joinPath("a", null, "b")).toBe("a/b"); });
});

describe("normalizePath", () => {
  it("collapses slashes", () => { expect(normalizePath("//a///b/")).toBe("/a/b"); });
});

describe("splitPath", () => {
  it("splits", () => { expect(splitPath("/a/b/c/")).toEqual(["a", "b", "c"]); });
});
