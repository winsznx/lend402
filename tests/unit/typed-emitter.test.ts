import { describe, it, expect } from "vitest";
import { TypedEmitter } from "../../src/lib/typed-emitter";

type Events = {
  data: [number];
  error: [string];
};

describe("TypedEmitter", () => {
  it("emits and receives events", () => {
    const emitter = new TypedEmitter<Events>();
    let received = 0;
    emitter.on("data", (n) => { received = n; });
    emitter.emit("data", 42);
    expect(received).toBe(42);
  });

  it("unsubscribes", () => {
    const emitter = new TypedEmitter<Events>();
    let count = 0;
    const unsub = emitter.on("data", () => { count++; });
    emitter.emit("data", 1);
    unsub();
    emitter.emit("data", 2);
    expect(count).toBe(1);
  });

  it("removeAllListeners", () => {
    const emitter = new TypedEmitter<Events>();
    let count = 0;
    emitter.on("data", () => { count++; });
    emitter.removeAllListeners();
    emitter.emit("data", 1);
    expect(count).toBe(0);
  });
});
