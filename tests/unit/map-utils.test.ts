import { describe, it, expect } from "vitest";
import { groupBy, keyBy, uniqueBy } from "../../src/lib/map-utils";

describe("groupBy", () => {
  it("groups items by key", () => {
    const items = [{ t: "a", v: 1 }, { t: "b", v: 2 }, { t: "a", v: 3 }];
    const grouped = groupBy(items, (i) => i.t);
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe("keyBy", () => {
  it("indexes items by key", () => {
    const items = [{ id: "x", v: 1 }, { id: "y", v: 2 }];
    const keyed = keyBy(items, (i) => i.id);
    expect(keyed.x.v).toBe(1);
    expect(keyed.y.v).toBe(2);
  });
});

describe("uniqueBy", () => {
  it("deduplicates by key", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    expect(uniqueBy(items, (i) => i.id)).toHaveLength(2);
  });
});
