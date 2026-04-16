import { describe, it, expect } from "vitest";
import {
  capitalize, toTitleCase, toCamelCase, toKebabCase, toSnakeCase,
  reverseString, countOccurrences,
} from "../../src/lib/string";

describe("case helpers", () => {
  it("capitalize", () => { expect(capitalize("hello")).toBe("Hello"); });
  it("toTitleCase", () => { expect(toTitleCase("hello world")).toBe("Hello World"); });
  it("toCamelCase", () => { expect(toCamelCase("hello-world")).toBe("helloWorld"); });
  it("toKebabCase", () => { expect(toKebabCase("helloWorld")).toBe("hello-world"); });
  it("toSnakeCase", () => { expect(toSnakeCase("hello-world")).toBe("hello_world"); });
});

describe("reverseString", () => {
  it("reverses", () => { expect(reverseString("abc")).toBe("cba"); });
});

describe("countOccurrences", () => {
  it("counts", () => { expect(countOccurrences("abcabcabc", "abc")).toBe(3); });
  it("empty needle", () => { expect(countOccurrences("abc", "")).toBe(0); });
});
