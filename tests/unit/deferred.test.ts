import { describe, it, expect } from "vitest";
import { deferred } from "../../src/lib/deferred";

describe("deferred", () => {
  it("resolves", async () => {
    const d = deferred<number>();
    d.resolve(42);
    expect(await d.promise).toBe(42);
  });

  it("rejects", async () => {
    const d = deferred<number>();
    d.reject(new Error("fail"));
    await expect(d.promise).rejects.toThrow("fail");
  });
});
