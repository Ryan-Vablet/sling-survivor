import { TUNING } from "../../content/tuning";
import type { Player } from "../entities";
import type { PointerDrag } from "../../core/input/PointerDrag";
import { v2 } from "../../core/math/vec2";

export class LauncherSystem {
  // Launcher origin in screen space is handled by scene; this system expects world coords impulse.
  // For scaffold: we interpret drag vector into an initial velocity impulse.
  applyLaunch(player: Player, drag: PointerDrag, worldFromScreen: (sx: number, sy: number) => { x: number; y: number }) {
    const st = drag.state;
    if (player.launched) return;
    if (st.isDragging) return;

    // If the user never dragged, do nothing.
    const dx = st.startX - st.x;
    const dy = st.startY - st.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return;

    const power = Math.min(TUNING.launcher.powerMax, Math.max(TUNING.launcher.powerMin, dist * TUNING.launcher.powerScale));
    const dir = v2.norm({ x: dx, y: dy });

    // Apply as velocity impulse
    player.vel.x = dir.x * power;
    player.vel.y = dir.y * power;

    player.launched = true;
  }
}
