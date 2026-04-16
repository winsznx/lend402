import { describe, it, expect } from "vitest";
import { caip2ToNetworkName, isMainnetCaip2, isValidCaip2 } from "../../src/lib/caip2";

describe("caip2ToNetworkName", () => {
  it("maps mainnet", () => { expect(caip2ToNetworkName("stacks:1")).toBe("mainnet"); });
  it("maps testnet", () => { expect(caip2ToNetworkName("stacks:2147483648")).toBe("testnet"); });
});

describe("isMainnetCaip2", () => {
  it("detects mainnet", () => { expect(isMainnetCaip2("stacks:1")).toBe(true); });
  it("rejects testnet", () => { expect(isMainnetCaip2("stacks:2147483648")).toBe(false); });
});

describe("isValidCaip2", () => {
  it("accepts valid", () => {
    expect(isValidCaip2("stacks:1")).toBe(true);
    expect(isValidCaip2("stacks:2147483648")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isValidCaip2("stacks:99")).toBe(false);
    expect(isValidCaip2("eip155:1")).toBe(false);
  });
});
