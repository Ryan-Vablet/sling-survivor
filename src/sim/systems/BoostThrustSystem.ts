import { TUNING } from "../../content/tuning";
import type { Player } from "../entities";
import type { Keyboard } from "../../core/input/Keyboard";

export class BoostThrustSystem {
  step(player: Player, kb: Keyboard, dt: number) {
    if (!player.launched) return;

    const axis = kb.getAxis();
    const ax = axis.x;
    const ay = axis.y;

    const wantsThrust = (ax !== 0 || ay !== 0);
    if (wantsThrust && player.boost > 0) {
      const accel = TUNING.player.thrustAccel;
      player.vel.x += ax * accel * dt;
      player.vel.y += ay * accel * dt;

      player.boost = Math.max(0, player.boost - TUNING.player.boostDrainPerSec * dt);
    } else {
      // regen while not thrusting
      player.boost = Math.min(TUNING.player.boostMax, player.boost + TUNING.player.boostRegenPerSec * dt);
    }
  }
}
