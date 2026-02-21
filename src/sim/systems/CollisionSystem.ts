import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile } from "../entities";
import type { DerivedPlayerStats } from "../runtime/RunState";

export class CollisionSystem {
  step(
    player: Player,
    drones: Drone[],
    projectiles: Projectile[],
    stats: DerivedPlayerStats,
    dt: number
  ) {
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.lifeT -= dt;
      if (p.lifeT <= 0) p.alive = false;

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      for (const d of drones) {
        if (!d.alive) continue;
        const dx = d.pos.x - p.pos.x;
        const dy = d.pos.y - p.pos.y;
        const rr = d.radius + p.radius;
        if (dx * dx + dy * dy <= rr * rr) {
          d.hp -= p.damage;
          p.alive = false;
          if (d.hp <= 0) {
            d.alive = false;
            player.kills += 1;
          }
          break;
        }
      }
    }

    for (const d of drones) {
      if (!d.alive) continue;
      const dx = d.pos.x - player.pos.x;
      const dy = d.pos.y - player.pos.y;
      const rr = d.radius + player.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        player.vel.x *= stats.contactSpeedRetain;
        player.vel.y *= stats.contactSpeedRetain;
        player.dragDebuffT = Math.max(player.dragDebuffT, stats.dragDebuffSec);

        const contactDmg = d.elite ? TUNING.elite.contactDamage : 2;
        player.hp = Math.max(0, player.hp - contactDmg);
        player.hits += 1;

        d.pos.x += dx * 0.2;
        d.pos.y += dy * 0.2;
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (!projectiles[i].alive) projectiles.splice(i, 1);
    }
    for (let i = drones.length - 1; i >= 0; i--) {
      if (!drones[i].alive) drones.splice(i, 1);
    }
  }
}
