import { describe, it, expect } from "vitest";
import { withRetry } from "../../src/lib/retry";

describe("withRetry", () => {
  it("returns on first success", async () => {
    const result = await withRetry(() => Promise.resolve(42), { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe(42);
  });

  it("retries on failure then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error("fail");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("throws after max attempts", async () => {
    await expect(
      withRetry(() => Promise.reject(new Error("always")), { maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toThrow("always");
  });
});
