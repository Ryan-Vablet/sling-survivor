import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { assetUrl } from "../../render/assets";
import { HelpOverlay } from "../../ui/HelpOverlay";
import { LeaderboardOverlay } from "../../ui/LeaderboardOverlay";

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
  private leaderboardOverlay = new LeaderboardOverlay();

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  enter(): void {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    const w = app.renderer.width;
    const h = app.renderer.height;

    const centerX = w / 2;
    const launchY = h * 0.56;
    const bottomPadding = 12;
    const smallButtonH = 48;
    const bottomButtonGap = 28;

    this.btn = this.buildLaunchButton();
    this.btn.x = centerX;
    this.btn.y = launchY;
    this.btnBaseY = launchY;
    this.root.addChild(this.btn);
    this.btn.eventMode = "static";
    this.btn.cursor = "pointer";
    this.btn.on("pointerdown", () => this.scenes.switchTo("run"));
    this.btn.on("pointerover", () => this.btn.scale.set(1.06));
    this.btn.on("pointerout", () => {});

    const bottomRowY = h - bottomPadding - smallButtonH / 2;
    const helpBtn = this.buildBevelButton("HOW TO PLAY", { blue: true, small: true });
    helpBtn.x = centerX;
    helpBtn.y = bottomRowY - smallButtonH - bottomButtonGap;
    this.root.addChild(helpBtn);
    helpBtn.eventMode = "static";
    helpBtn.cursor = "pointer";
    helpBtn.on("pointerdown", () => this.helpOverlay.show(w, h));
    helpBtn.on("pointerover", () => helpBtn.scale.set(1.04));
    helpBtn.on("pointerout", () => helpBtn.scale.set(1));

    const leaderboardBtn = this.buildBevelButton("LEADERBOARDS", { blue: true, small: true });
    leaderboardBtn.x = centerX;
    leaderboardBtn.y = bottomRowY;
    this.root.addChild(leaderboardBtn);
    leaderboardBtn.eventMode = "static";
    leaderboardBtn.cursor = "pointer";
    leaderboardBtn.on("pointerdown", () => this.leaderboardOverlay.show());
    leaderboardBtn.on("pointerover", () => leaderboardBtn.scale.set(1.04));
    leaderboardBtn.on("pointerout", () => leaderboardBtn.scale.set(1));

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

  exit(): void {
    this.helpOverlay.hide();
    this.leaderboardOverlay.hide();
  }

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

  /** Bevel-style button: gold (with glow) for Launch, or blue smaller for How to play / Leaderboards. */
  private buildBevelButton(
    text: string,
    opts: { blue?: boolean; small?: boolean } = {}
  ): Container {
    const small = opts.small ?? false;
    const blue = opts.blue ?? false;
    const W = small ? 200 : 230;
    const H = small ? 48 : 68;
    const R = small ? 14 : 18;

    const c = new Container();

    if (!small && !blue) {
      const glow = new Graphics();
      glow.roundRect(-W / 2 - 14, -H / 2 - 14, W + 28, H + 28, R + 12);
      glow.fill({ color: 0xffbf40, alpha: 0.18 });
      glow.roundRect(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16, R + 6);
      glow.fill({ color: 0xffbf40, alpha: 0.12 });
      c.addChild(glow);
    }

    const baseColor = blue ? 0x1a3a5a : 0x5c3d0a;
    const bodyColor = blue ? 0x3060a0 : 0xf0a828;
    const hiColor = blue ? 0x4080c0 : 0xffd870;
    const loColor = blue ? 0x204080 : 0xbb7a10;
    const rimColor = blue ? 0x6090cc : 0xffe8a8;
    const insetColor = blue ? 0x5090d0 : 0xfff4d0;
    const labelColor = blue ? 0xe8f4ff : 0xfffff0;
    const shadowColor = blue ? 0x102040 : 0x6b4400;

    const base = new Graphics();
    base.roundRect(-W / 2 + 2, -H / 2 + 4, W, H, R);
    base.fill({ color: baseColor, alpha: blue ? 0.8 : 0.7 });
    c.addChild(base);

    const body = new Graphics();
    body.roundRect(-W / 2, -H / 2, W, H, R);
    body.fill({ color: bodyColor });
    c.addChild(body);

    const hi = new Graphics();
    hi.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H * 0.4, R - 4);
    hi.fill({ color: hiColor, alpha: blue ? 0.5 : 0.55 });
    c.addChild(hi);

    const lo = new Graphics();
    lo.roundRect(-W / 2 + 4, H / 2 - H * 0.35, W - 8, H * 0.3, R - 4);
    lo.fill({ color: loColor, alpha: blue ? 0.4 : 0.35 });
    c.addChild(lo);

    const rim = new Graphics();
    rim.roundRect(-W / 2, -H / 2, W, H, R);
    rim.stroke({ width: 2.5, color: rimColor, alpha: 0.85 });
    c.addChild(rim);

    const inset = new Graphics();
    inset.roundRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6, R - 2);
    inset.stroke({ width: 1, color: insetColor, alpha: 0.3 });
    c.addChild(inset);

    const label = new Text({
      text,
      style: {
        fill: labelColor,
        fontSize: small ? 18 : 30,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: small ? 2 : 3,
        dropShadow: { color: shadowColor, blur: 2, distance: 1, angle: Math.PI / 3 },
      },
    });
    label.anchor.set(0.5);
    label.y = -1;
    c.addChild(label);

    return c;
  }

  /** Gold LAUNCH button with glow. */
  private buildLaunchButton(): Container {
    return this.buildBevelButton("LAUNCH", { blue: false, small: false });
  }
}
