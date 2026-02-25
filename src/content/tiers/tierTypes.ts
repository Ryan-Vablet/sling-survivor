export type TierReward = {
  scrapMult: number;
  coinGoldMult: number;
};

export type TierDifficulty = {
  enemyHpMult: number;
  enemySpeedMult: number;
  shooterChanceAdd: number;
  eliteChanceAdd: number;
};

export type TierVisuals = {
  groundColor: number;
  groundStroke: number;
  accentColor: number;
};

/** Environment (e.g. asteroids, coin placement). Driven only by these values. */
export type TierEnvironment = {
  /** 0..1; 0 = no asteroids. Spawn rate = baseAsteroidRate * asteroidDensity. */
  asteroidDensity: number;
  /** Min/max asteroids per spawn pulse (e.g. 1–3 = clusters instead of single stream). */
  asteroidSpawnMinPerPulse: number;
  asteroidSpawnMaxPerPulse: number;
  /** Extra vertical lift (px) for coin spawn base Y in this tier (e.g. T2+ coins slightly higher). */
  coinHeightLift: number;
};

export type TierDef = {
  id: string;
  name: string;
  startMeters: number;
  reward: TierReward;
  difficulty: TierDifficulty;
  visuals: TierVisuals;
  environment: TierEnvironment;
  shortLabel: string;
};
