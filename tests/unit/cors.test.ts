import { describe, it, expect } from "vitest";
import { buildCorsHeaders } from "../../src/lib/cors";

describe("buildCorsHeaders", () => {
  it("defaults to allow-all", () => {
    const h = buildCorsHeaders(null);
    expect(h["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("reflects specific origin when allowed", () => {
    const h = buildCorsHeaders("https://ok.com", { origin: ["https://ok.com"] });
    expect(h["Access-Control-Allow-Origin"]).toBe("https://ok.com");
  });

  it("omits when origin not allowed", () => {
    const h = buildCorsHeaders("https://bad.com", { origin: ["https://ok.com"] });
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("includes credentials when true", () => {
    const h = buildCorsHeaders(null, { credentials: true });
    expect(h["Access-Control-Allow-Credentials"]).toBe("true");
  });
});
