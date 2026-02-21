export type UpgradeRarity = "common" | "rare" | "epic";

export type StatMultEffect = {
  type: "stat_mult";
  stat: string;
  multiplier: number;
};

export type StatAddEffect = {
  type: "stat_add";
  stat: string;
  amount: number;
};

export type WeaponModEffect = {
  type: "weapon_mod";
  /** If set, only applies to weapons whose tags include this value. If omitted, applies to ALL active weapons. */
  weaponTag?: string;
  mods: Partial<{
    cooldownMult: number;
    damageMult: number;
    damageAdd: number;
    projectileSpeedMult: number;
    rangeMult: number;
    extraShotsAdd: number;
  }>;
};

export type SpecialEffect = {
  type: "special";
  specialId: string;
};

export type UpgradeEffect =
  | StatMultEffect
  | StatAddEffect
  | WeaponModEffect
  | SpecialEffect;

export type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rarity: UpgradeRarity;
  stackable: boolean;
  /** Hard cap on stacks. Undefined = unlimited (if stackable). */
  maxStacks?: number;
  /** Selection weight — overrides rarity-based default (common 100, rare 40, epic 10). */
  pickWeight?: number;
  /** Prerequisites: "upgrade:<id>" or "weapon:<id>". All must be met. */
  requires?: string[];
  /** Upgrade IDs that make this upgrade unavailable if already applied. */
  excludes?: string[];
  effect: UpgradeEffect;
};

export type UpgradeChoice = {
  def: UpgradeDef;
  currentStacks: number;
};

export const RARITY_WEIGHTS: Record<UpgradeRarity, number> = {
  common: 100,
  rare: 40,
  epic: 10,
};
