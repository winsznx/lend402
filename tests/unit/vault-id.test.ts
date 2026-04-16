import { describe, it, expect } from "vitest";
import { isVaultId, assertVaultId } from "../../src/lib/vault-id";

describe("isVaultId", () => {
  it("accepts UUID", () => { expect(isVaultId("123e4567-e89b-12d3-a456-426614174000")).toBe(true); });
  it("rejects non-UUID", () => { expect(isVaultId("abc")).toBe(false); });
});

describe("assertVaultId", () => {
  it("passes valid", () => { expect(() => assertVaultId("123e4567-e89b-12d3-a456-426614174000")).not.toThrow(); });
  it("throws invalid", () => { expect(() => assertVaultId("bad")).toThrow(); });
});
