import { TUNING } from "../../content/tuning";
import type { Drone, Player } from "../entities";

export class EnemySpawner {
  private t = 0;
  private nextId = 1;

  reset() {
    this.t = 0;
    this.nextId = 1;
  }

  step(player: Player, drones: Drone[], dt: number) {
    if (!player.launched) return;

    this.t += dt;
    const alive = drones.filter(d => d.alive).length;
    if (alive >= TUNING.enemy.maxAlive) return;

    if (this.t >= TUNING.enemy.spawnEverySec) {
      this.t = 0;

      const spawnX = player.pos.x + 600 + Math.random() * 400;
      const spawnY = player.pos.y - 200 - Math.random() * 250;

      drones.push({
        id: this.nextId++,
        pos: { x: spawnX, y: spawnY },
        vel: { x: 0, y: 0 },
        radius: 14,
        hp: 20,
        alive: true
      });
    }
  }
}
