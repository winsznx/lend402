import { describe, it, expect } from "vitest";
import { getOrGenerateRequestId, REQUEST_ID_HEADER } from "../../src/lib/request-id";

describe("getOrGenerateRequestId", () => {
  it("returns existing id from headers", () => {
    const headers = { get: (name: string) => (name === REQUEST_ID_HEADER ? "abc-123" : null) };
    expect(getOrGenerateRequestId(headers)).toBe("abc-123");
  });

  it("generates when missing", () => {
    const headers = { get: () => null };
    const id = getOrGenerateRequestId(headers);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates when value too long", () => {
    const headers = { get: () => "x".repeat(200) };
    const id = getOrGenerateRequestId(headers);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
