import { describe, it, expect } from "vitest";
import { invariant } from "../../src/lib/invariant";

describe("invariant", () => {
  it("passes on truthy", () => { expect(() => invariant(true, "ok")).not.toThrow(); });
  it("throws on falsy", () => { expect(() => invariant(false, "bad")).toThrow("Invariant violation: bad"); });
  it("throws on null", () => { expect(() => invariant(null, "null")).toThrow(); });
});
