import { describe, it, expect } from "vitest";
import { RNG } from "./rng";

describe("RNG", () => {
  it("produces deterministic floats for a given seed", () => {
    const a = new RNG(42);
    const b = new RNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.nextFloat()).toBe(b.nextFloat());
    }
  });

  it("produces values in [0, 1)", () => {
    const rng = new RNG(1);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt respects max bound", () => {
    const rng = new RNG(99);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("pick returns an element from the array", () => {
    const rng = new RNG(7);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it("shuffle is deterministic and contains all elements", () => {
    const rng1 = new RNG(123);
    const rng2 = new RNG(123);
    const arr = [1, 2, 3, 4, 5];

    const s1 = rng1.shuffle(arr);
    const s2 = rng2.shuffle(arr);

    expect(s1).toEqual(s2);
    expect(s1.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("different seeds produce different sequences", () => {
    const a = new RNG(1);
    const b = new RNG(2);
    const seqA = Array.from({ length: 10 }, () => a.nextFloat());
    const seqB = Array.from({ length: 10 }, () => b.nextFloat());
    expect(seqA).not.toEqual(seqB);
  });
});
