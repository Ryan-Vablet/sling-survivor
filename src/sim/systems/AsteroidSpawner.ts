import { TUNING } from "../../content/tuning";
import type { TierDef } from "../../content/tiers/tierTypes";
import type { Asteroid, AsteroidSizeClass } from "../entities";
import type { Player } from "../entities";
import type { RNG } from "../../core/rng/rng";

const ASTEROID_BASE_SCALE = 0.3;

export class AsteroidSpawner {
  private t = 0;
  private nextId = 1;

  reset(): void {
    this.t = 0;
    this.nextId = 1;
  }

  step(
    player: Player,
    asteroids: Asteroid[],
    rng: RNG,
    tier: TierDef,
    dt: number
  ): void {
    const density = tier.environment.asteroidDensity;
    if (density <= 0) {
      this.t = 0;
      this.stepDrift(asteroids, dt);
      return;
    }

    this.stepDrift(asteroids, dt);

    const alive = asteroids.filter((a) => a.alive).length;
    if (alive >= TUNING.asteroid.maxAlive) return;

    const interval = TUNING.asteroid.baseSpawnInterval / density;
    this.t += dt;
    if (this.t < interval) return;
    this.t = 0;

    const roll = rng.nextFloat();
    const sizeClass: AsteroidSizeClass =
      roll < 0.5 ? "small" : roll < 0.85 ? "medium" : "large";

    const cfg = TUNING.asteroid[sizeClass];
    const hpMult = tier.difficulty.enemyHpMult;
    const spriteIndex = 1 + rng.nextInt(6);
    /** Spawn ahead of player (off screen), similar spread to UFOs. */
    const spawnX = player.pos.x + 600 + rng.nextFloat() * 500;
    /** Spawn around player Y so asteroids appear at whatever altitude the player is at (like UFOs). */
    const spawnY = player.pos.y - 200 - rng.nextFloat() * 280;

    const driftSpeed = 25 + rng.nextFloat() * 35;
    const velX = -driftSpeed - rng.nextFloat() * 15;
    const velY = (rng.nextFloat() - 0.5) * 40;

    const spinSpeed = (rng.nextFloat() - 0.5) * 0.8;

    asteroids.push({
      id: this.nextId++,
      pos: { x: spawnX, y: spawnY },
      vel: { x: velX, y: velY },
      radius: cfg.radius,
      hp: Math.round(cfg.hp * hpMult),
      spriteIndex,
      sizeClass,
      rotation: rng.nextFloat() * Math.PI * 2,
      spinSpeed,
      alive: true,
      scrapReward: cfg.scrapReward,
    });
  }

  private stepDrift(asteroids: Asteroid[], dt: number): void {
    for (const a of asteroids) {
      if (!a.alive) continue;
      a.pos.x += a.vel.x * dt;
      a.pos.y += a.vel.y * dt;
      a.rotation += a.spinSpeed * dt;
    }
  }
}
