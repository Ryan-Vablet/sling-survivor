import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile } from "../entities";

export class CollisionSystem {
  step(player: Player, drones: Drone[], projectiles: Projectile[], dt: number) {
    // projectiles vs drones
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
        if (dx*dx + dy*dy <= rr*rr) {
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

    // drones vs player contact -> momentum penalty + drag debuff
    for (const d of drones) {
      if (!d.alive) continue;
      const dx = d.pos.x - player.pos.x;
      const dy = d.pos.y - player.pos.y;
      const rr = d.radius + player.radius;
      if (dx*dx + dy*dy <= rr*rr) {
        // apply penalty once per contact frame; simple approach
        player.vel.x *= TUNING.enemy.contactVelocityMul;
        player.vel.y *= TUNING.enemy.contactVelocityMul;
        player.dragDebuffT = Math.max(player.dragDebuffT, TUNING.enemy.dragDebuffSec);
        player.hp = Math.max(0, player.hp - 2);
        player.hits += 1;

        // push drone away a bit to avoid continuous overlap
        d.pos.x += dx * 0.2;
        d.pos.y += dy * 0.2;
      }
    }

    // cleanup
    for (const p of projectiles) if (!p.alive) {}
  }
}
