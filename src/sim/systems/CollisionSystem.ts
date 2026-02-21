import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile, EnemyBullet } from "../entities";
import type { DerivedPlayerStats } from "../runtime/RunState";

export class CollisionSystem {
  step(
    player: Player,
    drones: Drone[],
    projectiles: Projectile[],
    enemyBullets: EnemyBullet[],
    stats: DerivedPlayerStats,
    dt: number
  ) {
    // Player projectiles vs drones
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.lifeT -= dt;
      if (p.lifeT <= 0) { p.alive = false; continue; }

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      for (const d of drones) {
        if (!d.alive) continue;
        if (p.hitIds.includes(d.id)) continue;
        const dx = d.pos.x - p.pos.x;
        const dy = d.pos.y - p.pos.y;
        const rr = d.radius + p.radius;
        if (dx * dx + dy * dy <= rr * rr) {
          d.hp -= p.damage;
          if (d.hp <= 0) {
            d.alive = false;
            player.kills += 1;
          }
          if (p.piercing && p.pierceLeft > 0) {
            p.hitIds.push(d.id);
            p.pierceLeft--;
          } else {
            p.alive = false;
            break;
          }
        }
      }
    }

    // Drone body contact vs player
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

    // Enemy bullets vs player
    for (const eb of enemyBullets) {
      if (!eb.alive) continue;
      eb.lifeT -= dt;
      if (eb.lifeT <= 0) { eb.alive = false; continue; }

      eb.pos.x += eb.vel.x * dt;
      eb.pos.y += eb.vel.y * dt;

      const dx = player.pos.x - eb.pos.x;
      const dy = player.pos.y - eb.pos.y;
      const rr = player.radius + eb.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        player.vel.x *= eb.speedRetain;
        player.vel.y *= eb.speedRetain;
        player.dragDebuffT = Math.max(player.dragDebuffT, eb.dragDebuff);
        player.hp = Math.max(0, player.hp - eb.damage);
        player.hits += 1;
        eb.alive = false;
      }
    }

    // Cleanup dead entities
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (!projectiles[i].alive) projectiles.splice(i, 1);
    }
    for (let i = drones.length - 1; i >= 0; i--) {
      if (!drones[i].alive) drones.splice(i, 1);
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      if (!enemyBullets[i].alive) enemyBullets.splice(i, 1);
    }
  }
}
