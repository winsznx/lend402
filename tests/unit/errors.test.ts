import { describe, it, expect } from "vitest";
import { getErrorMessage, HttpError, ValidationError } from "../../src/lib/errors";

describe("getErrorMessage", () => {
  it("extracts from Error", () => { expect(getErrorMessage(new Error("x"))).toBe("x"); });
  it("returns string input", () => { expect(getErrorMessage("msg")).toBe("msg"); });
  it("serializes objects", () => { expect(getErrorMessage({ a: 1 })).toBe('{"a":1}'); });
});

describe("HttpError", () => {
  it("carries status", () => {
    const err = new HttpError(404, "not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("not found");
    expect(err.name).toBe("HttpError");
  });
});

describe("ValidationError", () => {
  it("carries field", () => {
    const err = new ValidationError("email", "invalid");
    expect(err.field).toBe("email");
  });
});
