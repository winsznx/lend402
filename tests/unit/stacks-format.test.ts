import { describe, it, expect } from "vitest";
import { formatSbtcAmount, formatUsdcxAmount, parseSbtcAmount, parseUsdcxAmount } from "../../src/lib/stacks-format";

describe("formatSbtcAmount", () => {
  it("formats satoshis to display", () => {
    expect(formatSbtcAmount(100_000_000)).toBe("1.000000");
    expect(formatSbtcAmount(750, 8)).toBe("0.00000750");
  });
});

describe("formatUsdcxAmount", () => {
  it("formats micro to display", () => {
    expect(formatUsdcxAmount(1_000_000)).toBe("1.00");
    expect(formatUsdcxAmount(500_000)).toBe("0.50");
  });
});

describe("parseSbtcAmount", () => {
  it("parses display to satoshis", () => {
    expect(parseSbtcAmount("1.0")).toBe(100_000_000);
  });
});

describe("parseUsdcxAmount", () => {
  it("parses display to micro", () => {
    expect(parseUsdcxAmount("1.00")).toBe(1_000_000);
  });
});
