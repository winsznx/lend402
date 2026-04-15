import { describe, it, expect } from "vitest";
import { vaultKeys, agentKeys, priceKeys } from "../../src/lib/query-keys";

describe("vaultKeys", () => {
  it("correct structures", () => {
    expect(vaultKeys.all).toEqual(["vaults"]);
    expect(vaultKeys.byId("a")).toEqual(["vaults", "a"]);
  });
});

describe("agentKeys", () => {
  it("correct structures", () => { expect(agentKeys.config()).toEqual(["agent", "config"]); });
});

describe("priceKeys", () => {
  it("correct structures", () => { expect(priceKeys.sbtc()).toEqual(["price", "sbtc"]); });
});
