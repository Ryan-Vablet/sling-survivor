export const TUNING = {
  sim: {
    fixedDt: 1 / 60
  },
  world: {
    gravity: 900, // px/s^2 (tune)
    airDrag: 0.02, // proportional drag
    groundFriction: 0.12,
    bounce: 0.15
  },
  player: {
    radius: 18,
    hpMax: 100,
    boostMax: 100,
    boostDrainPerSec: 14, // ~7s to empty
    boostRegenPerSec: 8,  // ~12.5s to full (only when boostAutoRegen is true)
    boostAutoRegen: true,
    thrustAccel: 1400,    // px/s^2
    stallSpeed: 35,       // px/s
    stallTime: 1.5        // seconds below stallSpeed to end run
  },
  launcher: {
    originX: 120,
    originY: 320,
    powerMin: 400,
    powerMax: 1600,
    powerScale: 2.0,
    maxPullDist: 400
  },
  enemy: {
    spawnEverySec: 2.0,
    maxAlive: 8,
    droneSpeed: 220,
    contactSpeedRetain: 0.75,
    dragDebuffSec: 0.75,
    /** Cull drones this far behind player (px). No points/FX; frees spawn cap. */
    cullBehindPx: 1600,
  },
  weapon: {
    fireCooldown: 0.35,
    range: 520,
    projectileSpeed: 900,
    damage: 10
  },
  rounds: {
    startingRockets: 3,
    baseToll: 100,
    tollScale: 1.7,
  },
  xp: {
    baseToLevel: 50,
    levelScale: 1.35,
    perKm: 50,
    perKill: 25,
  },
  scrap: {
    perKill: 10,
  },
  gold: {
    scrapToGoldRate: 0.5,
    rocketBonus: 15,
  },
  worldCoins: {
    goldPerPickup: 5,
    spawnIntervalMin: 800,
    spawnIntervalMax: 1200,
    clusterMin: 3,
    clusterMax: 6,
    pickupRadius: 32,
    coinSize: 48, // 2x original 24 for visibility; clean multiple for DPI
  },
  merchant: {
    upgradePriceCommon: 40,
    upgradePriceRare: 60,
    upgradePriceEpic: 80,
  },
  elite: {
    spawnEveryN: 5,
    hp: 60,
    speed: 260,
    radius: 20,
    contactDamage: 4
  },
  ramp: {
    spawnIntervalDecay: 0.0005,
    spawnIntervalMin: 0.8,
    maxAliveGrowth: 0.005,
    maxAliveCap: 20,
  },
  fx: {
    shatterGridW: 5,
    shatterGridH: 3,
    shatterLifetimeSec: 0.75,
    shatterSpeedMin: 120,
    shatterSpeedMax: 260,
    shatterDrag: 2.0,
    shatterGravity: 40,
    flashLifetimeSec: 0.18,
    ringLifetimeSec: 0.3,
  },
  shooter: {
    preferDistMin: 350,
    preferDistMax: 550,
    speed: 180,
    hp: 15,
    radius: 12,
    fireCooldown: 1.5,
    bulletSpeed: 350,
    bulletDamage: 1,
    bulletSpeedRetain: 0.9,
    bulletDragDebuff: 0.3,
    bulletLifeT: 2.5,
    bulletRadius: 5,
    spawnRatio: 0.25,
    minDistanceM: 200
  },
  asteroid: {
    /** Spawn interval = baseSpawnInterval / asteroidDensity (sec). Low base = high spawn rate so density ~fill feel (e.g. 0.35 → many on screen). */
    baseSpawnInterval: 0.5,
    maxAlive: 55,
    cullBehindPx: 1800,
    /** Player hits asteroid: vel *= this. */
    playerMomentumRetain: 0.35,
    /** Player HP damage per frame when touching asteroid. */
    playerContactDamage: 2,
    /** Visual scale: small = 1, then scale up so sky feels filled at all heights. */
    small: { scale: 1, hp: 40, radius: 18, scrapReward: 20 },
    medium: { scale: 1.25, hp: 90, radius: 28, scrapReward: 35 },
    large: { scale: 1.5, hp: 160, radius: 40, scrapReward: 50 },
  },
} as const;
