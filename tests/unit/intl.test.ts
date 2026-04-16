import { describe, it, expect } from "vitest";
import { formatUsd, formatCompact, formatPercent } from "../../src/lib/intl";

describe("formatUsd", () => {
  it("formats USD", () => { expect(formatUsd(1234.5)).toBe("\$1,234.50"); });
});

describe("formatCompact", () => {
  it("formats compact", () => { expect(formatCompact(1_500_000)).toBe("1.5M"); });
});

describe("formatPercent", () => {
  it("formats percent", () => { expect(formatPercent(0.1234)).toBe("12.34%"); });
});
