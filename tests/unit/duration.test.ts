import { describe, it, expect } from "vitest";
import { formatDuration } from "../../src/lib/duration";

describe("formatDuration", () => {
  it("formats seconds", () => { expect(formatDuration(45)).toBe("45s"); });
  it("formats minutes", () => { expect(formatDuration(125)).toBe("2m 5s"); });
  it("formats hours", () => { expect(formatDuration(3665)).toBe("1h 1m"); });
});
