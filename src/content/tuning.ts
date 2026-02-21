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
    boostAutoRegen: false, // future skill unlock
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
    dragDebuffSec: 0.75
  },
  weapon: {
    fireCooldown: 0.35,
    range: 520,
    projectileSpeed: 900,
    damage: 10
  },
  milestones: {
    firstDistanceM: 300,
    distanceIntervalM: 500,
    firstKills: 5,
    killsInterval: 10
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
    maxAliveCap: 15
  }
} as const;
