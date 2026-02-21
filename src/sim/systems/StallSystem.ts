import type { Player } from "../entities";
import type { DerivedPlayerStats } from "../runtime/RunState";

export class StallSystem {
  step(player: Player, stats: DerivedPlayerStats, dt: number): boolean {
    if (!player.launched) return false;

    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed < stats.stallSpeed) {
      player.stallT += dt;
    } else {
      player.stallT = 0;
    }

    return player.hp <= 0 || player.stallT >= stats.stallTime;
  }
}
