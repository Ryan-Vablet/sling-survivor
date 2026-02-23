/**
 * Single enemy death effect: boom glow (flash + ring) + shatter burst from texture slices.
 * Visual only; no gameplay. Cleans up textures and sprites when done.
 * Fragments use the enemy's texture sliced into a grid (same tint/scale) so they're always visible.
 */
import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from "pixi.js";
import { TUNING } from "../content/tuning";

const FX = TUNING.fx;

type Fragment = {
  sprite: Sprite;
  vx: number;
  vy: number;
  angularVel: number;
};

export class ExplosionFx {
  private container: Container;
  private fragments: Fragment[] = [];
  private flashGfx: Graphics | null = null;
  private ringGfx: Graphics | null = null;
  private lifetime = 0;
  /** Base scale so each fragment = 1/grid of ship; used in update for scale-over-time. */
  private fragScaleX = 1;
  private fragScaleY = 1;

  constructor(
    _renderer: unknown,
    worldX: number,
    worldY: number,
    enemySprite: Sprite,
    enemyVel: { x: number; y: number }
  ) {
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    // Boom first so it draws behind the fragments
    this.spawnBoomGlow();
    this.spawnShatter(enemySprite, enemyVel);
  }

  getContainer(): Container {
    return this.container;
  }

  /** Slice the enemy's texture into a grid; each cell = one piece. Scale so each fragment = 1/grid of ship. */
  private spawnShatter(enemySprite: Sprite, enemyVel: { x: number; y: number }): void {
    const tex = enemySprite.texture;
    if (!tex?.source) return;

    const gw = FX.shatterGridW;
    const gh = FX.shatterGridH;
    const texW = tex.width;
    const texH = tex.height;
    const cellW = texW / gw;
    const cellH = texH / gh;
    const sx = enemySprite.scale.x;
    const sy = enemySprite.scale.y;
    const displayW = texW * sx;
    const displayH = texH * sy;
    const fragW = displayW / gw;
    const fragH = displayH / gh;

    // Sub-frame texture may use full source size; scale so one fragment = fragW x fragH, then scale up
    const sizeNudge = 3.54; // 3x bigger than exact grid (was 1.18)
    this.fragScaleX = (sx / gw) * sizeNudge;
    this.fragScaleY = (sy / gh) * sizeNudge;

    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const frame = new Rectangle(gx * cellW, gy * cellH, cellW, cellH);
        const fragTex = new Texture({ source: tex.source, frame });
        const sprite = new Sprite(fragTex);
        sprite.anchor.set(0.5);
        sprite.tint = enemySprite.tint;
        sprite.scale.set(this.fragScaleX, this.fragScaleY);
        sprite.x = (gx + 0.5) * fragW - displayW / 2;
        sprite.y = (gy + 0.5) * fragH - displayH / 2;

        const angle = Math.atan2(sprite.y, sprite.x) + (Math.random() - 0.5) * 1.5;
        const speed =
          FX.shatterSpeedMin + Math.random() * (FX.shatterSpeedMax - FX.shatterSpeedMin);
        const vx = Math.cos(angle) * speed + enemyVel.x * 0.3;
        const vy = Math.sin(angle) * speed + enemyVel.y * 0.3;

        this.container.addChild(sprite);
        this.fragments.push({
          sprite,
          vx,
          vy,
          angularVel: (Math.random() - 0.5) * 12,
        });
      }
    }
  }

  private spawnBoomGlow(): void {
    const flash = new Graphics();
    flash.circle(0, 0, 28);
    flash.fill({ color: 0xffaa44, alpha: 0.9 });
    this.container.addChildAt(flash, 0);
    this.flashGfx = flash;

    const ring = new Graphics();
    this.container.addChild(ring);
    this.ringGfx = ring;
  }

  update(dt: number): boolean {
    this.lifetime += dt;
    const flashT = FX.flashLifetimeSec;
    const ringT = FX.ringLifetimeSec;
    const shatterT = FX.shatterLifetimeSec;

    if (this.flashGfx) {
      const t = this.lifetime / flashT;
      if (t >= 1) {
        this.container.removeChild(this.flashGfx);
        this.flashGfx.destroy();
        this.flashGfx = null;
      } else {
        this.flashGfx.alpha = 1 - t;
        this.flashGfx.scale.set(1 + t * 0.4);
      }
    }

    if (this.ringGfx) {
      const t = this.lifetime / ringT;
      if (t >= 1) {
        this.container.removeChild(this.ringGfx);
        this.ringGfx.destroy();
        this.ringGfx = null;
      } else {
        const r = 10 + (50 * t);
        this.ringGfx.clear();
        this.ringGfx.circle(0, 0, r);
        this.ringGfx.stroke({ width: 3, color: 0xff8844, alpha: 1 - t });
        this.ringGfx.alpha = 1 - t;
      }
    }

    const drag = Math.exp(-FX.shatterDrag * dt);
    const stillAlive: Fragment[] = [];
    for (const f of this.fragments) {
      f.sprite.x += f.vx * dt;
      f.sprite.y += f.vy * dt;
      f.sprite.rotation += f.angularVel * dt;
      f.vx *= drag;
      f.vy *= drag;
      f.vy += FX.shatterGravity * dt;

      const t = this.lifetime / shatterT;
      if (t >= 1) {
        f.sprite.destroy({ texture: true });
      } else {
        f.sprite.alpha = 1 - t;
        const grow = 1 + t * 0.15;
        f.sprite.scale.set(this.fragScaleX * grow, this.fragScaleY * grow);
        stillAlive.push(f);
      }
    }
    this.fragments = stillAlive;

    return this.lifetime >= Math.max(flashT, ringT, shatterT);
  }

  destroy(): void {
    for (const f of this.fragments) {
      f.sprite.destroy({ texture: true });
    }
    this.fragments = [];
    this.flashGfx?.destroy();
    this.ringGfx?.destroy();
    this.container.destroy({ children: true });
  }
}
