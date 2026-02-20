import { Graphics } from "pixi.js";

export class Debug {
  enabled = false;
  /** Reusable graphics layer for debug draws. */
  gfx = new Graphics();
}
