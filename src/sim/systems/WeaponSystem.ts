import type { Drone, Player, Projectile } from "../entities";
import type { RunState, DerivedWeaponStats } from "../runtime/RunState";
import { v2 } from "../../core/math/vec2";

export class WeaponSystem {
  private cooldowns = new Map<string, number>();
  private nextId = 1;

  reset() {
    this.cooldowns.clear();
    this.nextId = 1;
  }

  step(
    player: Player,
    drones: Drone[],
    projectiles: Projectile[],
    runState: RunState,
    dt: number
  ) {
    if (!player.launched) return;

    for (const weaponId of runState.weaponLoadout) {
      const ws = runState.weaponStats.get(weaponId);
      if (!ws) continue;

      let cd = this.cooldowns.get(weaponId) ?? 0;
      cd = Math.max(0, cd - dt);
      this.cooldowns.set(weaponId, cd);
      if (cd > 0) continue;

      if (ws.targetMode === "nearest") {
        this.fireNearest(player, drones, projectiles, ws);
      } else if (ws.targetMode === "rear") {
        this.fireRear(player, projectiles, ws);
      }
    }
  }

  private fireNearest(
    player: Player,
    drones: Drone[],
    projectiles: Projectile[],
    ws: DerivedWeaponStats
  ) {
    let best: Drone | null = null;
    let bestDist = Infinity;

    for (const d of drones) {
      if (!d.alive) continue;
      const dist = Math.hypot(
        d.pos.x - player.pos.x,
        d.pos.y - player.pos.y
      );
      if (dist < bestDist && dist <= ws.range) {
        best = d;
        bestDist = dist;
      }
    }

    if (!best) return;

    const dir = v2.norm({
      x: best.pos.x - player.pos.x,
      y: best.pos.y - player.pos.y,
    });
    this.emitShots(player, projectiles, ws, dir);
  }

  private fireRear(
    player: Player,
    projectiles: Projectile[],
    ws: DerivedWeaponStats
  ) {
    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed < 20) return;

    const raw = { x: -player.vel.x, y: -player.vel.y };
    const dir = v2.norm(raw);
    if (dir.x === 0 && dir.y === 0) {
      dir.x = -1;
    }
    this.emitShots(player, projectiles, ws, dir);
  }

  private emitShots(
    player: Player,
    projectiles: Projectile[],
    ws: DerivedWeaponStats,
    baseDir: { x: number; y: number }
  ) {
    const total = 1 + ws.extraShots;
    const baseAngle = Math.atan2(baseDir.y, baseDir.x);
    const spread = 0.12;

    for (let i = 0; i < total; i++) {
      const offset =
        total === 1 ? 0 : (i - (total - 1) / 2) * spread;
      const angle = baseAngle + offset;
      const shotDir = { x: Math.cos(angle), y: Math.sin(angle) };

      projectiles.push({
        id: this.nextId++,
        pos: { x: player.pos.x, y: player.pos.y },
        vel: v2.mul(shotDir, ws.projectileSpeed),
        radius: 4,
        damage: ws.damage,
        alive: true,
        lifeT: ws.projectileLifeT,
      });
    }

    this.cooldowns.set(ws.id, ws.fireCooldown);
  }
}
