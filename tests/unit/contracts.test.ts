import { describe, it, expect } from "vitest";
import { getVaultErrorName, VAULT_FUNCTIONS } from "../../src/lib/contracts";

describe("getVaultErrorName", () => {
  it("returns known", () => { expect(getVaultErrorName(100)).toBe("ERR-NOT-AUTHORIZED"); });
  it("returns fallback", () => { expect(getVaultErrorName(999)).toBe("UNKNOWN-ERROR-999"); });
});

describe("VAULT_FUNCTIONS", () => {
  it("has core names", () => {
    expect(VAULT_FUNCTIONS.BORROW_AND_PAY).toBe("borrow-and-pay");
    expect(VAULT_FUNCTIONS.SIMULATE_BORROW).toBe("simulate-borrow");
  });
});
