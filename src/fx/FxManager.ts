/**
 * Manages world-space FX (explosions, shatters). Spawns at position, updates each tick, respects pause.
 */
import { Container, type IRenderer, type Sprite } from "pixi.js";
import { ExplosionFx } from "./ExplosionFx";

export class FxManager {
  private container = new Container();
  private effects: ExplosionFx[] = [];

  getContainer(): Container {
    return this.container;
  }

  /**
   * Spawn enemy death FX at world position. Call before removing the enemy sprite.
   * Snapshot is taken from the sprite's current appearance (tint, scale, rotation).
   */
  spawnEnemyDeathFx(
    renderer: IRenderer,
    enemySprite: Sprite,
    worldPos: { x: number; y: number },
    enemyVel: { x: number; y: number }
  ): void {
    const fx = new ExplosionFx(
      renderer,
      worldPos.x,
      worldPos.y,
      enemySprite,
      enemyVel
    );
    this.container.addChild(fx.getContainer());
    this.effects.push(fx);
  }

  update(dt: number, paused: boolean): void {
    if (paused) return;
    const stillActive: ExplosionFx[] = [];
    for (const fx of this.effects) {
      const done = fx.update(dt);
      if (done) {
        fx.destroy();
      } else {
        stillActive.push(fx);
      }
    }
    this.effects = stillActive;
  }

  clear(): void {
    for (const fx of this.effects) {
      fx.destroy();
    }
    this.effects = [];
  }
}
