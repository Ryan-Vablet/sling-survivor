export type TargetMode = "nearest" | "rear";

export type WeaponDef = {
  id: string;
  name: string;
  tags: string[];
  baseCooldown: number;
  baseDamage: number;
  baseProjectileSpeed: number;
  baseRange: number;
  baseExtraShots: number;
  targetMode: TargetMode;
  projectileLifeT: number;
  basePierceCount: number;
};

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  auto_cannon: {
    id: "auto_cannon",
    name: "Auto-Cannon",
    tags: ["ballistic", "auto"],
    baseCooldown: 0.35,
    baseDamage: 10,
    baseProjectileSpeed: 900,
    baseRange: 520,
    baseExtraShots: 0,
    targetMode: "nearest",
    projectileLifeT: 1.2,
    basePierceCount: 0,
  },
  rear_blaster: {
    id: "rear_blaster",
    name: "Rear Blaster",
    tags: ["ballistic", "rear"],
    baseCooldown: 0.6,
    baseDamage: 8,
    baseProjectileSpeed: 700,
    baseRange: 400,
    baseExtraShots: 0,
    targetMode: "rear",
    projectileLifeT: 1.0,
    basePierceCount: 0,
  },
  rail_cannon: {
    id: "rail_cannon",
    name: "Rail Cannon",
    tags: ["ballistic", "auto", "piercing", "rail"],
    baseCooldown: 0.75,
    baseDamage: 40,
    baseProjectileSpeed: 1400,
    baseRange: 700,
    baseExtraShots: 0,
    targetMode: "nearest",
    projectileLifeT: 1.0,
    basePierceCount: 5,
  },
};
