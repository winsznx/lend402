import { describe, it, expect } from "vitest";
import { CONTENT_TYPES, isJsonContentType, isFormContentType } from "../../src/lib/content-type";

describe("CONTENT_TYPES", () => {
  it("has common types", () => {
    expect(CONTENT_TYPES.JSON).toBe("application/json");
    expect(CONTENT_TYPES.SSE).toBe("text/event-stream");
  });
});

describe("isJsonContentType", () => {
  it("detects with charset", () => {
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
  });
  it("rejects other", () => { expect(isJsonContentType("text/plain")).toBe(false); });
  it("rejects null", () => { expect(isJsonContentType(null)).toBe(false); });
});

describe("isFormContentType", () => {
  it("detects urlencoded", () => {
    expect(isFormContentType("application/x-www-form-urlencoded")).toBe(true);
  });
  it("detects multipart", () => {
    expect(isFormContentType("multipart/form-data; boundary=xyz")).toBe(true);
  });
});
