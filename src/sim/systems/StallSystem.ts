import { TUNING } from "../../content/tuning";
import type { Player } from "../entities";

export class StallSystem {
  step(player: Player, dt: number): boolean {
    if (!player.launched) return false;

    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed < TUNING.player.stallSpeed) {
      player.stallT += dt;
    } else {
      player.stallT = 0;
    }

    return player.hp <= 0 || player.stallT >= TUNING.player.stallTime;
  }
}
