import { describe, it, expect } from "vitest";
import { HTTP_METHODS, isSafeMethod } from "../../src/lib/http-method";

describe("HTTP_METHODS", () => {
  it("includes common methods", () => {
    expect(HTTP_METHODS.GET).toBe("GET");
    expect(HTTP_METHODS.POST).toBe("POST");
  });
});

describe("isSafeMethod", () => {
  it("detects safe", () => {
    expect(isSafeMethod("GET")).toBe(true);
    expect(isSafeMethod("HEAD")).toBe(true);
    expect(isSafeMethod("OPTIONS")).toBe(true);
  });
  it("detects unsafe", () => {
    expect(isSafeMethod("POST")).toBe(false);
    expect(isSafeMethod("DELETE")).toBe(false);
  });
});
