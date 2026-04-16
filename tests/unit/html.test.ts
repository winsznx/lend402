import { describe, it, expect } from "vitest";
import { escapeHtml, stripHtml } from "../../src/lib/html";

describe("escapeHtml", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
});

describe("stripHtml", () => {
  it("removes tags", () => { expect(stripHtml("<p>hi <b>there</b></p>")).toBe("hi there"); });
});
