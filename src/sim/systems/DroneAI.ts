import { TUNING } from "../../content/tuning";
import type { Drone, Player, EnemyBullet } from "../entities";
import { v2 } from "../../core/math/vec2";

export class DroneAI {
  private nextBulletId = 1;

  reset() {
    this.nextBulletId = 1;
  }

  step(
    player: Player,
    drones: Drone[],
    enemyBullets: EnemyBullet[],
    dt: number
  ) {
    if (!player.launched) return;

    for (const d of drones) {
      if (!d.alive) continue;
      if (d.droneType === "shooter") {
        this.stepShooter(d, player, enemyBullets, dt);
      } else {
        this.stepChaser(d, player, dt);
      }
    }
  }

  private stepChaser(d: Drone, player: Player, dt: number) {
    const to = v2.sub(player.pos, d.pos);
    const dir = v2.norm(to);

    d.vel.x = dir.x * d.speed;
    d.vel.y = dir.y * d.speed;

    d.pos.x += d.vel.x * dt;
    d.pos.y += d.vel.y * dt;
  }

  private stepShooter(
    d: Drone,
    player: Player,
    enemyBullets: EnemyBullet[],
    dt: number
  ) {
    const s = TUNING.shooter;
    const to = v2.sub(player.pos, d.pos);
    const dist = v2.len(to);
    const dir = v2.norm(to);

    if (dist > s.preferDistMax) {
      d.vel.x = dir.x * d.speed;
      d.vel.y = dir.y * d.speed;
    } else if (dist < s.preferDistMin) {
      d.vel.x = -dir.x * d.speed;
      d.vel.y = -dir.y * d.speed;
    } else {
      d.vel.x = -dir.y * d.speed * 0.35;
      d.vel.y = dir.x * d.speed * 0.35;
    }

    d.pos.x += d.vel.x * dt;
    d.pos.y += d.vel.y * dt;

    d.shootTimer -= dt;
    if (d.shootTimer <= 0 && dist < s.preferDistMax * 1.5) {
      d.shootTimer = s.fireCooldown;
      const aim = v2.norm(to);
      enemyBullets.push({
        id: this.nextBulletId++,
        pos: { x: d.pos.x, y: d.pos.y },
        vel: v2.mul(aim, s.bulletSpeed),
        radius: s.bulletRadius,
        damage: s.bulletDamage,
        speedRetain: s.bulletSpeedRetain,
        dragDebuff: s.bulletDragDebuff,
        alive: true,
        lifeT: s.bulletLifeT,
      });
    }
  }
}
