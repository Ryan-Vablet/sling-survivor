import { UPGRADE_DEFS } from "./upgradeDefs";
import type { UpgradeDef, UpgradeChoice } from "./upgradeTypes";
import { RARITY_WEIGHTS } from "./upgradeTypes";
import type { RNG } from "../../core/rng/rng";

export function getAvailableUpgrades(
  applied: Map<string, number>,
  weaponLoadout: string[] = ["auto_cannon"]
): UpgradeDef[] {
  return UPGRADE_DEFS.filter((def) => {
    const stacks = applied.get(def.id) ?? 0;

    if (!def.stackable && stacks > 0) return false;
    if (def.maxStacks != null && stacks >= def.maxStacks) return false;

    if (def.excludes) {
      for (const exId of def.excludes) {
        if ((applied.get(exId) ?? 0) > 0) return false;
      }
    }

    if (def.requires) {
      for (const req of def.requires) {
        if (req.startsWith("upgrade:")) {
          const id = req.slice(8);
          if ((applied.get(id) ?? 0) <= 0) return false;
        } else if (req.startsWith("weapon:")) {
          const id = req.slice(7);
          if (!weaponLoadout.includes(id)) return false;
        }
      }
    }

    return true;
  });
}

function weightOf(def: UpgradeDef): number {
  return def.pickWeight ?? RARITY_WEIGHTS[def.rarity];
}

export function rollUpgradeChoices(
  rng: RNG,
  applied: Map<string, number>,
  count = 3,
  weaponLoadout: string[] = ["auto_cannon"]
): UpgradeChoice[] {
  const pool = getAvailableUpgrades(applied, weaponLoadout).map((def) => ({
    def,
    weight: weightOf(def),
  }));
  if (pool.length === 0) return [];

  const picks: UpgradeChoice[] = [];
  const remaining = [...pool];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalW = remaining.reduce((sum, e) => sum + e.weight, 0);
    let roll = rng.nextFloat() * totalW;
    let idx = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      roll -= remaining[j].weight;
      if (roll <= 0) {
        idx = j;
        break;
      }
    }
    picks.push({
      def: remaining[idx].def,
      currentStacks: applied.get(remaining[idx].def.id) ?? 0,
    });
    remaining.splice(idx, 1);
  }

  return picks;
}
