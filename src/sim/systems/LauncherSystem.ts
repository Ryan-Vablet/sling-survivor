import { TUNING } from "../../content/tuning";
import type { Player } from "../entities";
import type { PointerDrag } from "../../core/input/PointerDrag";
import { v2 } from "../../core/math/vec2";

export class LauncherSystem {
  /**
   * Anchored slingshot: pull vector = anchorScreen - pointerScreen.
   * Launch direction matches the pull-back direction (drag away from anchor to aim).
   */
  applyLaunch(player: Player, drag: PointerDrag, anchorScreenX: number, anchorScreenY: number) {
    const st = drag.state;
    if (player.launched) return;
    if (!st.released) return;

    const dx = anchorScreenX - st.x;
    const dy = anchorScreenY - st.y;
    const dist = Math.hypot(dx, dy);

    st.released = false;
    if (dist < 6) return;

    const clampedDist = Math.min(dist, TUNING.launcher.maxPullDist);
    const power = Math.min(
      TUNING.launcher.powerMax,
      Math.max(TUNING.launcher.powerMin, clampedDist * TUNING.launcher.powerScale)
    );
    const dir = v2.norm({ x: dx, y: dy });

    player.vel.x = dir.x * power;
    player.vel.y = dir.y * power;
    player.launched = true;
  }
}
