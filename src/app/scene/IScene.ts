export interface IScene {
  /** Called once when the scene is mounted/activated. */
  enter(): void;
  /** Called once when the scene is unmounted/deactivated. */
  exit(): void;
  /** Variable-time update (render-frame delta, seconds). */
  update(dt: number): void;
  /** Optional: fixed-step update (seconds). */
  fixedUpdate?(dt: number): void;
  /** Optional: called when the window/canvas is resized (e.g. device rotation). w,h = renderer width, height. */
  resize?(w: number, h: number): void;
}
