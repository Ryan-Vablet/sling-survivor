import type { Container } from "pixi.js";

export class Camera2D {
  private targetX = 0;
  private targetY = 0;

  constructor(private world: Container) {}

  follow(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  update(dt: number) {
    // Smooth follow (critically damped-ish)
    const lerp = 1 - Math.exp(-dt * 8);
    this.world.x += (-this.targetX - this.world.x) * lerp;
    this.world.y += (-this.targetY - this.world.y) * lerp;
  }
}
