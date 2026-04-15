import { describe, it, expect } from "vitest";
import { splitContractId, normalizeTxid, stripTrailingSlash, getNormalizedStacksNetwork, getCaip2NetworkId } from "../../src/lib/network";

describe("splitContractId", () => {
  it("splits address.name", () => {
    const r = splitContractId("SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV.lend402-vault");
    expect(r.address).toBe("SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV");
    expect(r.name).toBe("lend402-vault");
  });
  it("throws on invalid", () => { expect(() => splitContractId("no-dot")).toThrow(); });
});

describe("normalizeTxid", () => {
  it("adds 0x prefix", () => { expect(normalizeTxid("abc")).toBe("0xabc"); });
  it("preserves 0x", () => { expect(normalizeTxid("0xabc")).toBe("0xabc"); });
});

describe("stripTrailingSlash", () => {
  it("strips", () => { expect(stripTrailingSlash("https://x.com/")).toBe("https://x.com"); });
});

describe("getNormalizedStacksNetwork", () => {
  it("returns testnet", () => { expect(getNormalizedStacksNetwork("testnet")).toBe("testnet"); });
  it("defaults mainnet", () => { expect(getNormalizedStacksNetwork(undefined)).toBe("mainnet"); });
});

describe("getCaip2NetworkId", () => {
  it("returns correct ids", () => {
    expect(getCaip2NetworkId("mainnet")).toBe("stacks:1");
    expect(getCaip2NetworkId("testnet")).toBe("stacks:2147483648");
  });
});
