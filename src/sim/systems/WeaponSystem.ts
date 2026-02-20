import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile } from "../entities";
import { v2 } from "../../core/math/vec2";

export class WeaponSystem {
  private cooldownT = 0;
  private nextId = 1;

  reset() {
    this.cooldownT = 0;
    this.nextId = 1;
  }

  step(player: Player, drones: Drone[], projectiles: Projectile[], dt: number) {
    if (!player.launched) return;

    this.cooldownT = Math.max(0, this.cooldownT - dt);
    if (this.cooldownT > 0) return;

    // nearest drone in range
    let best: Drone | null = null;
    let bestDist = Infinity;

    for (const d of drones) {
      if (!d.alive) continue;
      const dist = Math.hypot(d.pos.x - player.pos.x, d.pos.y - player.pos.y);
      if (dist < bestDist && dist <= TUNING.weapon.range) {
        best = d;
        bestDist = dist;
      }
    }

    if (!best) return;

    const dir = v2.norm({ x: best.pos.x - player.pos.x, y: best.pos.y - player.pos.y });
    projectiles.push({
      id: this.nextId++,
      pos: { x: player.pos.x, y: player.pos.y },
      vel: v2.mul(dir, TUNING.weapon.projectileSpeed),
      radius: 4,
      damage: TUNING.weapon.damage,
      alive: true,
      lifeT: 1.2
    });

    this.cooldownT = TUNING.weapon.fireCooldown;
  }
}
