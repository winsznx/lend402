import { describe, it, expect } from "vitest";
import {
  isRecoverableVaultError,
  isUserFacingVaultError,
  describeVaultError,
} from "../../src/lib/vault-error-set";

describe("isRecoverableVaultError", () => {
  it("flags oracle stale", () => { expect(isRecoverableVaultError(105)).toBe(true); });
  it("does not flag unauthorized", () => { expect(isRecoverableVaultError(100)).toBe(false); });
});

describe("isUserFacingVaultError", () => {
  it("flags insufficient collateral", () => { expect(isUserFacingVaultError(103)).toBe(true); });
  it("does not flag transfer failure", () => { expect(isUserFacingVaultError(110)).toBe(false); });
});

describe("describeVaultError", () => {
  it("returns error name", () => { expect(describeVaultError(100)).toBe("ERR-NOT-AUTHORIZED"); });
  it("falls back for unknown", () => { expect(describeVaultError(999)).toBe("UNKNOWN-ERROR-999"); });
});
