import type { TierDef } from "./tierTypes";

export const TIER_DEFS: readonly TierDef[] = [
  {
    id: "T0",
    name: "Low Orbit",
    startMeters: 0,
    reward: { scrapMult: 1.0, coinGoldMult: 1.0 },
    difficulty: {
      enemyHpMult: 1.0,
      enemySpeedMult: 1.0,
      shooterChanceAdd: 0,
      eliteChanceAdd: 0,
    },
    visuals: {
      groundColor: 0x1b2a3a,
      groundStroke: 0x2d4a5e,
      accentColor: 0x6688aa,
    },
    environment: {
      asteroidDensity: 0,
      asteroidSpawnMinPerPulse: 1,
      asteroidSpawnMaxPerPulse: 1,
      coinHeightLift: 0,
    },
    shortLabel: "T0",
  },
  {
    id: "T1",
    name: "Debris Field",
    startMeters: 1000,
    reward: { scrapMult: 1.25, coinGoldMult: 1.25 },
    difficulty: {
      enemyHpMult: 1.2,
      enemySpeedMult: 1.05,
      shooterChanceAdd: 0.05,
      eliteChanceAdd: 0,
    },
    visuals: {
      groundColor: 0x1f2a2a,
      groundStroke: 0x33554a,
      accentColor: 0x55cc88,
    },
    environment: {
      asteroidDensity: 0.25,
      asteroidSpawnMinPerPulse: 1,
      asteroidSpawnMaxPerPulse: 2,
      coinHeightLift: 0,
    },
    shortLabel: "T1",
  },
  {
    id: "T2",
    name: "Asteroid Belt",
    startMeters: 2000,
    reward: { scrapMult: 1.5, coinGoldMult: 1.5 },
    difficulty: {
      enemyHpMult: 1.45,
      enemySpeedMult: 1.1,
      shooterChanceAdd: 0.1,
      eliteChanceAdd: 0.02,
    },
    visuals: {
      groundColor: 0x2a1f2a,
      groundStroke: 0x553355,
      accentColor: 0xcc66aa,
    },
    environment: {
      asteroidDensity: 0.35,
      asteroidSpawnMinPerPulse: 1,
      asteroidSpawnMaxPerPulse: 3,
      coinHeightLift: 18,
    },
    shortLabel: "T2",
  },
  {
    id: "T3",
    name: "Deep Space",
    startMeters: 3000,
    reward: { scrapMult: 2.0, coinGoldMult: 2.0 },
    difficulty: {
      enemyHpMult: 1.85,
      enemySpeedMult: 1.15,
      shooterChanceAdd: 0.15,
      eliteChanceAdd: 0.05,
    },
    visuals: {
      groundColor: 0x2a1a1a,
      groundStroke: 0x553333,
      accentColor: 0xff6644,
    },
    environment: {
      asteroidDensity: 0.45,
      asteroidSpawnMinPerPulse: 2,
      asteroidSpawnMaxPerPulse: 4,
      coinHeightLift: 18,
    },
    shortLabel: "T3",
  },
];

export function getTierForDistance(distanceM: number): TierDef {
  let result = TIER_DEFS[0];
  for (const tier of TIER_DEFS) {
    if (distanceM >= tier.startMeters) {
      result = tier;
    }
  }
  return result;
}
