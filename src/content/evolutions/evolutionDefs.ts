import type { EvolutionDef } from "./evolutionTypes";

export const EVOLUTION_DEFS: EvolutionDef[] = [
  {
    id: "auto_to_rail",
    name: "Rail Cannon",
    description: "Auto-Cannon evolves into Rail Cannon with piercing shots.",
    sourceWeaponId: "auto_cannon",
    resultWeaponId: "rail_cannon",
    requiresUpgrades: {
      extra_shot: 1,
      projectile_speed_up: 1,
      cannon_damage_up: 1,
    },
    oneTime: true,
  },
];
