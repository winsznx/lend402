import { describe, it, expect } from "vitest";
import { COLLATERAL_RATIO_BPS, PROTOCOL_FEE_BPS, MIN_BORROW_USDCX, SBTC_DECIMALS, USDCX_DECIMALS } from "../../src/lib/protocol";

describe("protocol constants", () => {
  it("collateral ratio", () => { expect(COLLATERAL_RATIO_BPS).toBe(15000); });
  it("fee", () => { expect(PROTOCOL_FEE_BPS).toBe(30); });
  it("min borrow", () => { expect(MIN_BORROW_USDCX).toBe(1_000_000); });
  it("decimals", () => { expect(SBTC_DECIMALS).toBe(8); expect(USDCX_DECIMALS).toBe(6); });
});
