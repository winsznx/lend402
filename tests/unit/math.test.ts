import { describe, it, expect } from "vitest";
import { bpsToPercent, percentToBps, bpsOf, microUsdcxToUsd, usdToMicroUsdcx, satoshisToBtc, btcToSatoshis } from "../../src/lib/math";

describe("bps conversions", () => {
  it("bpsToPercent", () => { expect(bpsToPercent(15000)).toBe(150); });
  it("percentToBps", () => { expect(percentToBps(150)).toBe(15000); });
  it("bpsOf", () => { expect(bpsOf(1_000_000, 30)).toBe(3000); });
});

describe("currency conversions", () => {
  it("microUsdcx", () => { expect(microUsdcxToUsd(1_000_000)).toBe(1); });
  it("usdToMicro", () => { expect(usdToMicroUsdcx(1)).toBe(1_000_000); });
  it("satoshis", () => { expect(satoshisToBtc(100_000_000)).toBe(1); });
  it("btc", () => { expect(btcToSatoshis(1)).toBe(100_000_000); });
});
