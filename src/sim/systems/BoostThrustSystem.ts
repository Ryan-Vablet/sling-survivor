import type { Player } from "../entities";
import type { Keyboard } from "../../core/input/Keyboard";
import type { DerivedPlayerStats } from "../runtime/RunState";

export class BoostThrustSystem {
  step(player: Player, kb: Keyboard, stats: DerivedPlayerStats, dt: number) {
    if (!player.launched) return;

    const axis = kb.getAxis();
    const ax = axis.x;
    const ay = axis.y;

    const wantsThrust = ax !== 0 || ay !== 0;
    if (wantsThrust && player.boost > 0) {
      player.vel.x += ax * stats.thrustAccel * dt;
      player.vel.y += ay * stats.thrustAccel * dt;

      player.boost = Math.max(0, player.boost - stats.boostDrainPerSec * dt);
    } else if (!wantsThrust && stats.boostAutoRegen) {
      player.boost = Math.min(
        stats.boostMax,
        player.boost + stats.boostRegenPerSec * dt
      );
    }
  }
}
