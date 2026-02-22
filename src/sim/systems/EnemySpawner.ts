import { TUNING } from "../../content/tuning";
import type { TierDef } from "../../content/tiers/tierTypes";
import type { Drone, Player } from "../entities";
import type { RNG } from "../../core/rng/rng";

export class EnemySpawner {
  private t = 0;
  private nextId = 1;
  private spawnCount = 0;

  reset() {
    this.t = 0;
    this.nextId = 1;
    this.spawnCount = 0;
  }

  step(
    player: Player,
    drones: Drone[],
    rng: RNG,
    distanceM: number,
    tier: TierDef,
    dt: number
  ) {
    if (!player.launched) return;

    this.t += dt;
    const alive = drones.filter((d) => d.alive).length;

    const maxAlive = Math.min(
      TUNING.ramp.maxAliveCap,
      TUNING.enemy.maxAlive +
        Math.floor(distanceM * TUNING.ramp.maxAliveGrowth)
    );
    if (alive >= maxAlive) return;

    const interval = Math.max(
      TUNING.ramp.spawnIntervalMin,
      TUNING.enemy.spawnEverySec - distanceM * TUNING.ramp.spawnIntervalDecay
    );

    if (this.t >= interval) {
      this.t = 0;
      this.spawnCount++;

      const shooterChance =
        TUNING.shooter.spawnRatio + tier.difficulty.shooterChanceAdd;
      const isShooter =
        distanceM >= TUNING.shooter.minDistanceM &&
        rng.nextFloat() < shooterChance;

      const eliteBase = this.spawnCount > 0 && this.spawnCount % TUNING.elite.spawnEveryN === 0;
      const eliteBonus = rng.nextFloat() < tier.difficulty.eliteChanceAdd;
      const isElite = !isShooter && (eliteBase || eliteBonus);

      const hpMult = tier.difficulty.enemyHpMult;
      const spdMult = tier.difficulty.enemySpeedMult;

      const spawnX = player.pos.x + 600 + rng.nextFloat() * 400;
      const spawnY = player.pos.y - 200 - rng.nextFloat() * 250;

      let baseHp: number;
      let baseSpeed: number;
      if (isShooter) {
        baseHp = TUNING.shooter.hp;
        baseSpeed = TUNING.shooter.speed;
      } else if (isElite) {
        baseHp = TUNING.elite.hp;
        baseSpeed = TUNING.elite.speed;
      } else {
        baseHp = 20;
        baseSpeed = TUNING.enemy.droneSpeed;
      }

      drones.push({
        id: this.nextId++,
        pos: { x: spawnX, y: spawnY },
        vel: { x: 0, y: 0 },
        radius: isShooter
          ? TUNING.shooter.radius
          : isElite
            ? TUNING.elite.radius
            : 14,
        hp: Math.round(baseHp * hpMult),
        speed: baseSpeed * spdMult,
        alive: true,
        elite: isElite,
        droneType: isShooter ? "shooter" : "chaser",
        shootTimer: isShooter ? TUNING.shooter.fireCooldown : 0,
      });
    }
  }

  spawnShooterNear(player: Player, drones: Drone[]) {
    drones.push({
      id: this.nextId++,
      pos: { x: player.pos.x + 400, y: player.pos.y - 150 },
      vel: { x: 0, y: 0 },
      radius: TUNING.shooter.radius,
      hp: TUNING.shooter.hp,
      speed: TUNING.shooter.speed,
      alive: true,
      elite: false,
      droneType: "shooter",
      shootTimer: TUNING.shooter.fireCooldown,
    });
  }
}
