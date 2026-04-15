import { describe, it, expect } from "vitest";
import { bytesToHex, hexToBytes, isHex } from "../../src/lib/hex";

describe("bytesToHex", () => {
  it("encodes bytes", () => {
    expect(bytesToHex(new Uint8Array([0, 1, 255]))).toBe("0001ff");
  });
});

describe("hexToBytes", () => {
  it("decodes hex", () => {
    expect(hexToBytes("0001ff")).toEqual(new Uint8Array([0, 1, 255]));
  });
  it("handles 0x prefix", () => {
    expect(hexToBytes("0x0001ff")).toEqual(new Uint8Array([0, 1, 255]));
  });
});

describe("isHex", () => {
  it("validates hex strings", () => {
    expect(isHex("0xabcd")).toBe(true);
    expect(isHex("abcd")).toBe(true);
    expect(isHex("xyz")).toBe(false);
    expect(isHex("abc")).toBe(false);
  });
});
