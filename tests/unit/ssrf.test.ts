import { describe, it, expect } from "vitest";
import { isAllowedUrl } from "../../src/lib/ssrf";

describe("isAllowedUrl", () => {
  it("allows HTTPS", () => { expect(isAllowedUrl("https://api.example.com/data").allowed).toBe(true); });
  it("rejects HTTP", () => { expect(isAllowedUrl("http://api.example.com").allowed).toBe(false); });
  it("rejects localhost", () => { expect(isAllowedUrl("https://localhost/api").allowed).toBe(false); });
  it("rejects private IPs", () => { expect(isAllowedUrl("https://10.0.0.1/x").allowed).toBe(false); });
  it("rejects metadata", () => { expect(isAllowedUrl("https://169.254.169.254/latest").allowed).toBe(false); });
  it("rejects malformed", () => { expect(isAllowedUrl("not-a-url").allowed).toBe(false); });
});
