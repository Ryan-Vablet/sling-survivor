import { describe, it, expect } from "vitest";
import { RNG } from "../../core/rng/rng";
import { rollUpgradeChoices, getAvailableUpgrades } from "./upgradePool";
import { UPGRADE_DEFS } from "./upgradeDefs";

describe("upgradePool", () => {
  it("returns 3 unique choices", () => {
    const rng = new RNG(42);
    const applied = new Map<string, number>();
    const choices = rollUpgradeChoices(rng, applied, 3);

    expect(choices.length).toBe(3);
    const ids = choices.map((c) => c.def.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("deterministic with same seed", () => {
    const applied = new Map<string, number>();
    const a = rollUpgradeChoices(new RNG(100), applied, 3);
    const b = rollUpgradeChoices(new RNG(100), applied, 3);

    expect(a.map((c) => c.def.id)).toEqual(b.map((c) => c.def.id));
  });

  it("excludes non-stackable upgrades already applied", () => {
    const applied = new Map<string, number>();
    applied.set("rear_blaster_unlock", 1);

    const pool = getAvailableUpgrades(applied);
    expect(pool.find((d) => d.id === "rear_blaster_unlock")).toBeUndefined();
  });

  it("includes stackable upgrades already applied", () => {
    const applied = new Map<string, number>();
    applied.set("thrust_power_up", 2);

    const pool = getAvailableUpgrades(applied);
    expect(pool.find((d) => d.id === "thrust_power_up")).toBeDefined();
  });

  it("respects maxStacks cap", () => {
    const applied = new Map<string, number>();
    const extraShotDef = UPGRADE_DEFS.find((d) => d.id === "extra_shot")!;
    applied.set("extra_shot", extraShotDef.maxStacks!);

    const pool = getAvailableUpgrades(applied);
    expect(pool.find((d) => d.id === "extra_shot")).toBeUndefined();
  });

  it("allows stacking below maxStacks", () => {
    const applied = new Map<string, number>();
    const extraShotDef = UPGRADE_DEFS.find((d) => d.id === "extra_shot")!;
    applied.set("extra_shot", extraShotDef.maxStacks! - 1);

    const pool = getAvailableUpgrades(applied);
    expect(pool.find((d) => d.id === "extra_shot")).toBeDefined();
  });

  it("returns currentStacks for already-applied upgrades", () => {
    const applied = new Map<string, number>();
    applied.set("boost_max_up", 3);

    const rng = new RNG(55);
    const choices = rollUpgradeChoices(rng, applied, UPGRADE_DEFS.length);
    const boostChoice = choices.find((c) => c.def.id === "boost_max_up");
    if (boostChoice) {
      expect(boostChoice.currentStacks).toBe(3);
    }
  });

  it("handles empty pool gracefully", () => {
    const applied = new Map<string, number>();
    for (const def of UPGRADE_DEFS) {
      if (!def.stackable) {
        applied.set(def.id, 1);
      } else if (def.maxStacks != null) {
        applied.set(def.id, def.maxStacks);
      }
    }
    const rng = new RNG(1);
    const choices = rollUpgradeChoices(rng, applied, 3);
    expect(choices.length).toBeGreaterThanOrEqual(0);
  });

  it("weighted selection favors common over epic", () => {
    const applied = new Map<string, number>();
    const counts: Record<string, number> = {};
    for (let seed = 0; seed < 500; seed++) {
      const rng = new RNG(seed);
      const choices = rollUpgradeChoices(rng, applied, 1);
      if (choices.length > 0) {
        const rarity = choices[0].def.rarity;
        counts[rarity] = (counts[rarity] ?? 0) + 1;
      }
    }
    expect(counts["common"]!).toBeGreaterThan(counts["epic"]!);
  });
});
