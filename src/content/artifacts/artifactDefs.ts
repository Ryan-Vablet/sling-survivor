import type { ArtifactDef } from "./artifactTypes";

export const ARTIFACT_DEFS: readonly ArtifactDef[] = [
  {
    id: "extra_rocket",
    name: "Extra Rocket",
    description: "+1 rocket per round.",
    goldCost: 150,
  },
  {
    id: "scrap_magnet",
    name: "Scrap Magnet",
    description: "+25% scrap earned per kill.",
    goldCost: 120,
  },
  {
    id: "golden_thrusters",
    name: "Golden Thrusters",
    description: "+20% gold from world coins.",
    goldCost: 140,
  },
  {
    id: "emergency_fuel",
    name: "Emergency Fuel",
    description: "+50 max boost capacity.",
    goldCost: 160,
  },
] as const;
