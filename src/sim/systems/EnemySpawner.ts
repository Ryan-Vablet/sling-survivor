import { TUNING } from "../../content/tuning";
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
    dt: number
  ) {
    if (!player.launched) return;

    this.t += dt;
    const alive = drones.filter((d) => d.alive).length;

    const maxAlive = Math.min(
      TUNING.ramp.maxAliveCap,
      TUNING.enemy.maxAlive + Math.floor(distanceM * TUNING.ramp.maxAliveGrowth)
    );
    if (alive >= maxAlive) return;

    const interval = Math.max(
      TUNING.ramp.spawnIntervalMin,
      TUNING.enemy.spawnEverySec - distanceM * TUNING.ramp.spawnIntervalDecay
    );

    if (this.t >= interval) {
      this.t = 0;
      this.spawnCount++;

      const isElite =
        this.spawnCount > 0 &&
        this.spawnCount % TUNING.elite.spawnEveryN === 0;

      const spawnX = player.pos.x + 600 + rng.nextFloat() * 400;
      const spawnY = player.pos.y - 200 - rng.nextFloat() * 250;

      drones.push({
        id: this.nextId++,
        pos: { x: spawnX, y: spawnY },
        vel: { x: 0, y: 0 },
        radius: isElite ? TUNING.elite.radius : 14,
        hp: isElite ? TUNING.elite.hp : 20,
        alive: true,
        elite: isElite,
      });
    }
  }
}
