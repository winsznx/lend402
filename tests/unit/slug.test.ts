import { describe, it, expect } from "vitest";
import { slugify } from "../../src/lib/slug";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => { expect(slugify("Hello World")).toBe("hello-world"); });
  it("strips special chars", () => { expect(slugify("foo@bar!baz")).toBe("foo-bar-baz"); });
  it("trims dashes", () => { expect(slugify("--hello--")).toBe("hello"); });
});
