import { TUNING } from "../../content/tuning";
import type { Drone, Player } from "../entities";
import { v2 } from "../../core/math/vec2";

export class DroneAI {
  step(player: Player, drones: Drone[], dt: number) {
    if (!player.launched) return;

    for (const d of drones) {
      if (!d.alive) continue;

      const to = v2.sub(player.pos, d.pos);
      const dir = v2.norm(to);
      const spd = TUNING.enemy.droneSpeed;

      d.vel.x = dir.x * spd;
      d.vel.y = dir.y * spd;

      d.pos.x += d.vel.x * dt;
      d.pos.y += d.vel.y * dt;
    }
  }
}
