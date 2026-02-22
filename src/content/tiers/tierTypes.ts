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

export type TierDef = {
  id: string;
  name: string;
  startMeters: number;
  reward: TierReward;
  difficulty: TierDifficulty;
  visuals: TierVisuals;
  shortLabel: string;
};
