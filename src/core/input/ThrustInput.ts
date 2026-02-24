/**
 * Thrust axis: -1..1 for left/right and up/down (screen: up = negative y, down = positive y).
 * Used for both keyboard (WASD) and virtual joystick (touch/drag).
 */
export type ThrustAxis = { x: number; y: number };

export interface IThrustInput {
  getAxis(): ThrustAxis;
}

/** Virtual joystick: axis = drag offset from start, normalized. Same semantics as WASD (up = -y, down = +y). */
const DEAD_ZONE_PX = 18;

export function virtualJoystickAxis(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): ThrustAxis {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const dist = Math.hypot(dx, dy);
  if (dist < DEAD_ZONE_PX) return { x: 0, y: 0 };
  return { x: dx / dist, y: dy / dist };
}

export type DragStateLike = {
  isDragging: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
};

/** Keyboard + virtual joystick (touch/drag). Keyboard takes priority when any key is down. */
export class CombinedThrustInput implements IThrustInput {
  constructor(
    private keyboard: IThrustInput,
    private drag: DragStateLike,
    private isLaunched: () => boolean
  ) {}

  getAxis(): ThrustAxis {
    const kb = this.keyboard.getAxis();
    if (kb.x !== 0 || kb.y !== 0) return kb;
    if (!this.isLaunched() || !this.drag.isDragging) return { x: 0, y: 0 };
    return virtualJoystickAxis(
      this.drag.startX,
      this.drag.startY,
      this.drag.x,
      this.drag.y
    );
  }
}
