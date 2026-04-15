import { describe, it, expect } from "vitest";
import { ok, err, unwrap, type Result } from "../../src/lib/result";

describe("Result", () => {
  it("ok() creates success", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(unwrap(r)).toBe(42);
  });

  it("err() creates failure", () => {
    const r = err(new Error("fail"));
    expect(r.ok).toBe(false);
  });

  it("unwrap throws on error", () => {
    expect(() => unwrap(err(new Error("boom")))).toThrow("boom");
  });
});
