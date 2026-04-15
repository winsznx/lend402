import { describe, it, expect } from "vitest";
import { encodeBase64, decodeBase64, encodeBase64Json, decodeBase64Json } from "../../src/lib/base64";

describe("base64", () => {
  it("round-trips strings", () => {
    expect(decodeBase64(encodeBase64("hello"))).toBe("hello");
  });
  it("round-trips JSON", () => {
    const obj = { foo: "bar", n: 42 };
    expect(decodeBase64Json(encodeBase64Json(obj))).toEqual(obj);
  });
});
