import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { assetUrl } from "../../render/assets";
import { HelpOverlay } from "../../ui/HelpOverlay";

const COIN_FRAMES = 8;
const COIN_FRAME_SIZE = 256;

export class TitleScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();
  private elapsed = 0;
  private btn!: Container;
  private btnBaseY = 0;
  private bg: Sprite | null = null;
  private coin: AnimatedSprite | null = null;
  private helpOverlay = new HelpOverlay();

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  enter(): void {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    const w = app.renderer.width;
    const h = app.renderer.height;

    this.root.addChild(this.helpOverlay.root);

    const helpIcon = this.buildHelpIcon();
    helpIcon.x = w - 36;
    helpIcon.y = 36;
    this.root.addChild(helpIcon);
    helpIcon.eventMode = "static";
    helpIcon.cursor = "pointer";
    helpIcon.on("pointerdown", () => this.helpOverlay.show(w, h));

    // Build button immediately (appears on top once bg loads behind it)
    this.btn = this.buildLaunchButton();
    this.btn.x = w / 2;
    this.btn.y = h * 0.80;
    this.btnBaseY = this.btn.y;
    this.root.addChild(this.btn);

    this.btn.eventMode = "static";
    this.btn.cursor = "pointer";
    this.btn.on("pointerdown", () => this.scenes.switchTo("run"));
    this.btn.on("pointerover", () => this.btn.scale.set(1.06));
    this.btn.on("pointerout", () => {}); // reset handled by update loop

    // Load background async — inserts behind button when ready
    Assets.load<any>(assetUrl("/title_mockup.png")).then((texture) => {
      this.bg = new Sprite(texture);
      this.coverFit(w, h);
      this.root.addChildAt(this.bg, 0);
    });

    // Load coin sprite sheet and create animated sprite
    Assets.load<Texture>(assetUrl("/coin_flip_sheet.png")).then((sheetTex) => {
      const frameW = sheetTex.width / COIN_FRAMES;
      const frameH = sheetTex.height;
      const frames: Texture[] = [];
      for (let i = 0; i < COIN_FRAMES; i++) {
        frames.push(new Texture({
          source: sheetTex.source,
          frame: new Rectangle(i * frameW, 0, frameW, frameH)
        }));
      }
      this.coin = new AnimatedSprite(frames);
      this.coin.animationSpeed = 0.18;
      this.coin.width = 128;
      this.coin.height = 128;
      this.coin.x = 20;
      this.coin.y = 20;
      this.coin.play();
      this.root.addChild(this.coin);
    });
  }

  exit(): void {}

  update(dt: number): void {
    this.elapsed += dt;
    if (!this.btn) return;

    // Primary bob (slow float)
    const bob = Math.sin(this.elapsed * 1.6) * 10;
    // Secondary micro-drift on a different frequency
    const drift = Math.sin(this.elapsed * 2.9) * 3;
    this.btn.y = this.btnBaseY + bob + drift;

    // Gentle scale pulse
    const pulse = 1.0 + Math.sin(this.elapsed * 2.2) * 0.018;
    this.btn.scale.set(pulse);

    // Very subtle tilt
    this.btn.rotation = Math.sin(this.elapsed * 1.1) * 0.02;
  }

  /** Scale the background sprite to cover the full viewport (may crop). */
  private coverFit(viewW: number, viewH: number) {
    if (!this.bg) return;
    const tex = this.bg.texture;
    const scale = Math.max(viewW / tex.width, viewH / tex.height);
    this.bg.scale.set(scale);
    this.bg.x = (viewW - tex.width * scale) / 2;
    this.bg.y = (viewH - tex.height * scale) / 2;
  }

  /** Help (?) icon for rules popup. */
  private buildHelpIcon(): Container {
    const c = new Container();
    const r = 18;
    const circle = new Graphics();
    circle.circle(0, 0, r);
    circle.fill({ color: 0x2a3a4a, alpha: 0.95 });
    circle.circle(0, 0, r);
    circle.stroke({ width: 2, color: 0x6688aa, alpha: 0.9 });
    c.addChild(circle);
    const q = new Text({
      text: "?",
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
      },
    });
    q.anchor.set(0.5);
    c.addChild(q);
    return c;
  }

  /** Gold ingot-style "LAUNCH" button with beveled layers. */
  private buildLaunchButton(): Container {
    const c = new Container();
    const W = 230;
    const H = 68;
    const R = 18;

    // Glow aura
    const glow = new Graphics();
    glow.roundRect(-W / 2 - 14, -H / 2 - 14, W + 28, H + 28, R + 12);
    glow.fill({ color: 0xFFBF40, alpha: 0.18 });
    glow.roundRect(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16, R + 6);
    glow.fill({ color: 0xFFBF40, alpha: 0.12 });
    c.addChild(glow);

    // Dark base / drop shadow
    const base = new Graphics();
    base.roundRect(-W / 2 + 2, -H / 2 + 4, W, H, R);
    base.fill({ color: 0x5C3D0A, alpha: 0.7 });
    c.addChild(base);

    // Main gold body
    const body = new Graphics();
    body.roundRect(-W / 2, -H / 2, W, H, R);
    body.fill({ color: 0xF0A828 });
    c.addChild(body);

    // Top highlight band (upper 40% of button, lighter gold)
    const hi = new Graphics();
    hi.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H * 0.40, R - 4);
    hi.fill({ color: 0xFFD870, alpha: 0.55 });
    c.addChild(hi);

    // Bottom shadow band
    const lo = new Graphics();
    lo.roundRect(-W / 2 + 4, H / 2 - H * 0.35, W - 8, H * 0.30, R - 4);
    lo.fill({ color: 0xBB7A10, alpha: 0.35 });
    c.addChild(lo);

    // Crisp bright border
    const rim = new Graphics();
    rim.roundRect(-W / 2, -H / 2, W, H, R);
    rim.stroke({ width: 2.5, color: 0xFFE8A8, alpha: 0.85 });
    c.addChild(rim);

    // Inner inset line for extra bevel depth
    const inset = new Graphics();
    inset.roundRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6, R - 2);
    inset.stroke({ width: 1, color: 0xFFF4D0, alpha: 0.30 });
    c.addChild(inset);

    // "LAUNCH" label
    const label = new Text({
      text: "LAUNCH",
      style: {
        fill: 0xFFFFF0,
        fontSize: 30,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 3,
        dropShadow: {
          color: 0x6B4400,
          blur: 3,
          distance: 2,
          angle: Math.PI / 3
        }
      }
    });
    label.anchor.set(0.5);
    label.y = -1;
    c.addChild(label);

    return c;
  }
}
