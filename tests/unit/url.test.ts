import { describe, it, expect } from "vitest";
import { buildExplorerTxUrl, buildExplorerAddressUrl, buildVaultProxyUrl } from "../../src/lib/url";

describe("buildExplorerTxUrl", () => {
  it("builds URL", () => {
    expect(buildExplorerTxUrl("https://explorer.hiro.so", "abc", "mainnet")).toBe("https://explorer.hiro.so/txid/0xabc?chain=mainnet");
  });
});

describe("buildExplorerAddressUrl", () => {
  it("builds URL", () => {
    expect(buildExplorerAddressUrl("https://explorer.hiro.so", "SP123", "mainnet")).toBe("https://explorer.hiro.so/address/SP123?chain=mainnet");
  });
});

describe("buildVaultProxyUrl", () => {
  it("builds URL", () => {
    expect(buildVaultProxyUrl("https://gw.lend402.xyz", "abc-123")).toBe("https://gw.lend402.xyz/v/abc-123");
  });
});
