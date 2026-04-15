import { describe, it, expect } from "vitest";
import { truncateAddress, isMainnetAddress, isTestnetAddress } from "../../src/lib/address";

describe("truncateAddress", () => {
  it("truncates long addresses", () => {
    const addr = "SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV";
    const result = truncateAddress(addr);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(addr.length);
  });
  it("leaves short strings unchanged", () => {
    expect(truncateAddress("SP31")).toBe("SP31");
  });
});

describe("isMainnetAddress", () => {
  it("detects SP", () => { expect(isMainnetAddress("SP31DP")).toBe(true); });
  it("detects SM", () => { expect(isMainnetAddress("SM3VDX")).toBe(true); });
  it("rejects ST", () => { expect(isMainnetAddress("ST1PQ")).toBe(false); });
});

describe("isTestnetAddress", () => {
  it("detects ST", () => { expect(isTestnetAddress("ST1PQ")).toBe(true); });
  it("rejects SP", () => { expect(isTestnetAddress("SP31")).toBe(false); });
});
