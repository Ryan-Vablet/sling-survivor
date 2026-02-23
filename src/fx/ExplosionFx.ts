/**
 * Single enemy death effect: boom glow (flash + ring) + shatter burst from RenderTexture snapshot.
 * Visual only; no gameplay. Cleans up textures and sprites when done.
 */
import {
  Container,
  Graphics,
  Rectangle,
  RenderTexture,
  Sprite,
  Texture,
  type IRenderer,
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
  private renderTexture: RenderTexture | null = null;
  private snapContainer: Container | null = null;

  constructor(
    private renderer: IRenderer,
    worldX: number,
    worldY: number,
    enemySprite: Sprite,
    enemyVel: { x: number; y: number }
  ) {
    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;

    const rt = this.snapshotEnemy(enemySprite);
    if (rt) {
      this.renderTexture = rt;
      this.spawnShatter(rt, enemyVel);
    }
    this.spawnBoomGlow();
  }

  getContainer(): Container {
    return this.container;
  }

  private snapshotEnemy(enemySprite: Sprite): RenderTexture | null {
    const tex = enemySprite.texture;
    if (!tex) return null;
    const w = Math.min(96, Math.max(48, Math.ceil(tex.width * enemySprite.scale.x)));
    const h = Math.min(96, Math.max(48, Math.ceil(tex.height * enemySprite.scale.y)));
    const snapW = w;
    const snapH = h;
    this.snapContainer = new Container();
    const clone = new Sprite(tex);
    clone.anchor.set(0.5);
    clone.x = snapW / 2;
    clone.y = snapH / 2;
    clone.scale.copyFrom(enemySprite.scale);
    clone.rotation = enemySprite.rotation;
    clone.tint = enemySprite.tint;
    this.snapContainer.addChild(clone);

    const rt = RenderTexture.create({ width: snapW, height: snapH });
    this.renderer.render({
      container: this.snapContainer,
      renderTexture: rt,
      clear: true,
    });
    this.snapContainer.destroy({ children: true });
    this.snapContainer = null;
    return rt;
  }

  private spawnShatter(rt: RenderTexture, enemyVel: { x: number; y: number }): void {
    const gw = FX.shatterGridW;
    const gh = FX.shatterGridH;
    const snapW = rt.width;
    const snapH = rt.height;
    const cellW = snapW / gw;
    const cellH = snapH / gh;
    const halfW = snapW / 2;
    const halfH = snapH / 2;

    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const x = gx * cellW;
        const y = gy * cellH;
        const frame = new Rectangle(x, y, cellW, cellH);
        const fragTex = new Texture({ source: rt.source, frame });
        const sprite = new Sprite(fragTex);
        sprite.anchor.set(0.5);
        sprite.x = (x + cellW / 2) - halfW;
        sprite.y = (y + cellH / 2) - halfH;

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
        f.sprite.scale.set(1 + t * 0.15);
        stillAlive.push(f);
      }
    }
    this.fragments = stillAlive;

    const done = this.lifetime >= Math.max(flashT, ringT, shatterT);
    if (done && this.renderTexture) {
      this.renderTexture.destroy(true);
      this.renderTexture = null;
    }
    return done;
  }

  destroy(): void {
    for (const f of this.fragments) {
      f.sprite.destroy();
    }
    this.fragments = [];
    this.flashGfx?.destroy();
    this.ringGfx?.destroy();
    this.renderTexture?.destroy(true);
    this.snapContainer?.destroy({ children: true });
    this.container.destroy({ children: true });
  }
}
