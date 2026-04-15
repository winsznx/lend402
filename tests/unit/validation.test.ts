import { describe, it, expect } from "vitest";
import { isStacksAddress, isContractId, isTxid, isUuid, isPositiveInteger, clampNumber } from "../../src/lib/validation";

describe("isStacksAddress", () => {
  it("accepts valid mainnet address", () => {
    expect(isStacksAddress("SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isStacksAddress("not-an-address")).toBe(false);
  });
});

describe("isContractId", () => {
  it("accepts valid contract id", () => {
    expect(isContractId("SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV.lend402-vault")).toBe(true);
  });
  it("rejects bare address", () => {
    expect(isContractId("SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV")).toBe(false);
  });
});

describe("isTxid", () => {
  it("accepts 0x-prefixed txid", () => { expect(isTxid("0x" + "a".repeat(64))).toBe(true); });
  it("rejects short", () => { expect(isTxid("abc")).toBe(false); });
});

describe("isUuid", () => {
  it("accepts valid", () => { expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true); });
  it("rejects invalid", () => { expect(isUuid("nope")).toBe(false); });
});

describe("isPositiveInteger", () => {
  it("accepts 1", () => { expect(isPositiveInteger(1)).toBe(true); });
  it("rejects 0", () => { expect(isPositiveInteger(0)).toBe(false); });
});

describe("clampNumber", () => {
  it("clamps", () => {
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(15, 0, 10)).toBe(10);
  });
});
