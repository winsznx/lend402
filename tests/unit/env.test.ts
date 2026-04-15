import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requiredEnv, optionalEnv, numericEnv, booleanEnv } from "../../src/lib/env";

describe("requiredEnv", () => {
  beforeEach(() => { process.env.TEST_REQ = "hello"; });
  afterEach(() => { delete process.env.TEST_REQ; });
  it("returns value", () => { expect(requiredEnv("TEST_REQ")).toBe("hello"); });
  it("throws when missing", () => { expect(() => requiredEnv("NOPE_X")).toThrow(); });
});

describe("optionalEnv", () => {
  it("returns fallback", () => { expect(optionalEnv("NOPE_X", "def")).toBe("def"); });
});

describe("numericEnv", () => {
  beforeEach(() => { process.env.TEST_N = "42"; });
  afterEach(() => { delete process.env.TEST_N; });
  it("parses", () => { expect(numericEnv("TEST_N", 0)).toBe(42); });
  it("fallback", () => { expect(numericEnv("NOPE_X", 99)).toBe(99); });
});

describe("booleanEnv", () => {
  afterEach(() => { delete process.env.TEST_B; });
  it("parses true", () => { process.env.TEST_B = "true"; expect(booleanEnv("TEST_B")).toBe(true); });
  it("fallback", () => { expect(booleanEnv("NOPE_X", false)).toBe(false); });
});
