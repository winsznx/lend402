import { describe, it, expect } from "vitest";
import { truncateMiddle, formatUsdcx, formatSatoshis, pluralize } from "../../src/lib/format";

describe("truncateMiddle", () => {
  it("returns short strings unchanged", () => {
    expect(truncateMiddle("abc", 10)).toBe("abc");
  });
  it("truncates with ellipsis", () => {
    const long = "SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV";
    const result = truncateMiddle(long, 16);
    expect(result.length).toBeLessThanOrEqual(16);
    expect(result).toContain("...");
  });
});

describe("formatUsdcx", () => {
  it("formats micro-USDCx to dollar string", () => {
    expect(formatUsdcx(1_000_000)).toBe("\$1.00");
    expect(formatUsdcx(500_000)).toBe("\$0.50");
    expect(formatUsdcx(0)).toBe("\$0.00");
  });
});

describe("formatSatoshis", () => {
  it("formats satoshis to sBTC string", () => {
    expect(formatSatoshis(100_000_000)).toBe("1.00000000 sBTC");
    expect(formatSatoshis(750)).toBe("0.00000750 sBTC");
  });
});

describe("pluralize", () => {
  it("returns singular for count 1", () => {
    expect(pluralize(1, "vault")).toBe("vault");
  });
  it("returns plural for count != 1", () => {
    expect(pluralize(0, "vault")).toBe("vaults");
    expect(pluralize(5, "vault")).toBe("vaults");
  });
  it("uses custom plural", () => {
    expect(pluralize(3, "index", "indices")).toBe("indices");
  });
});
