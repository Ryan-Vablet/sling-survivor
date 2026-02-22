import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { assetUrl } from "../render/assets";

const PANEL_W = 420;
const PANEL_H = 520;
const PADDING = 24;
const PLACEHOLDER_W = 160;
const PLACEHOLDER_H = 90;
const COIN_FRAMES = 8;

export class HelpOverlay {
  root = new Container();

  private backdrop = new Graphics();
  private panel = new Container();
  private closeBtn: Container | null = null;

  constructor() {
    this.root.visible = false;
    this.root.addChild(this.backdrop, this.panel);
  }

  show(viewW: number, viewH: number) {
    this.root.visible = true;
    this.build(viewW, viewH);
  }

  hide() {
    this.root.visible = false;
    this.panel.removeChildren();
    this.closeBtn = null;
  }

  private build(viewW: number, viewH: number) {
    this.panel.removeChildren();

    this.backdrop.clear();
    this.backdrop.rect(0, 0, viewW, viewH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.7 });
    this.backdrop.eventMode = "static";
    this.backdrop.on("pointerdown", () => this.hide());

    const panelX = (viewW - PANEL_W) / 2;
    const panelY = (viewH - PANEL_H) / 2;

    const panelBg = new Graphics();
    panelBg.roundRect(0, 0, PANEL_W, PANEL_H, 16);
    panelBg.fill({ color: 0x12122a, alpha: 0.98 });
    panelBg.roundRect(0, 0, PANEL_W, PANEL_H, 16);
    panelBg.stroke({ width: 2, color: 0x4488aa, alpha: 0.6 });
    panelBg.x = panelX;
    panelBg.y = panelY;
    panelBg.eventMode = "static";
    this.panel.addChild(panelBg);

    const title = new Text({
      text: "How to Play",
      style: {
        fill: 0xffffff,
        fontSize: 24,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
      },
    });
    title.anchor.set(0.5, 0);
    title.x = panelX + PANEL_W / 2;
    title.y = panelY + PADDING;
    this.panel.addChild(title);

    let y = panelY + PADDING + 36;

    const bodyStyle = {
      fill: 0xccccdd,
      fontSize: 14,
      fontFamily: "system-ui, sans-serif",
      wordWrap: true,
      wordWrapWidth: PANEL_W - PADDING * 2,
      lineHeight: 20,
    };

    const placeholderUrl = (text: string) =>
      `https://placehold.co/${PLACEHOLDER_W}x${PLACEHOLDER_H}/2a2a4a/8899aa?text=${encodeURIComponent(text)}`;

    const addPlaceholder = (imgY: number, text: string) => {
      Assets.load<Texture>(placeholderUrl(text)).then((tex) => {
        const img = new Sprite(tex);
        img.x = panelX + PADDING;
        img.y = imgY;
        img.width = PLACEHOLDER_W;
        img.height = PLACEHOLDER_H;
        this.panel.addChild(img);
      }).catch(() => {});
    };

    const section = (heading: string, body: string, placeholderText?: string) => {
      const h = new Text({
        text: heading,
        style: {
          fill: 0x88aacc,
          fontSize: 15,
          fontFamily: "system-ui, sans-serif",
          fontWeight: "bold",
        },
      });
      h.x = panelX + PADDING;
      h.y = y;
      this.panel.addChild(h);
      y += 22;

      if (placeholderText) {
        addPlaceholder(y, placeholderText);
        y += PLACEHOLDER_H + 10;
      }

      const t = new Text({ text: body, style: bodyStyle });
      t.x = panelX + PADDING;
      t.y = y;
      this.panel.addChild(t);
      y += t.height + 18;
    };

    section(
      "Launch",
      "Pull back on the launcher and release to launch your rocket. The further you pull, the more power.",
      "Pull & release"
    );
    section(
      "Thrust",
      "Use WASD or Arrow keys to thrust and steer. Your boost bar depletes while thrusting and refills when you don't.",
      "WASD thrust"
    );
    section(
      "Collect coins",
      "Fly through gold coins in the world to earn currency. Spend it at the merchant between rounds.",
    );
    Assets.load<Texture>(assetUrl("/coin_flip_sheet.png")).then((sheetTex) => {
      const frameW = sheetTex.width / COIN_FRAMES;
      const frameH = sheetTex.height;
      const frame = new Texture({
        source: sheetTex.source,
        frame: new Rectangle(0, 0, frameW, frameH),
      });
      const coin = new Sprite(frame);
      coin.width = 32;
      coin.height = 32;
      coin.x = panelX + PANEL_W - PADDING - 40;
      coin.y = y - 42;
      this.panel.addChild(coin);
    }).catch(() => {});

    section(
      "Fight enemies",
      "UFOs chase and shoot at you. Destroy them with your weapon to gain scrap and XP. Level up to choose upgrades.",
      "UFOs"
    );
    section(
      "Survive",
      "Reach the round toll in scrap before you run out of rockets. Pay the toll at the merchant to advance. Good luck!",
    );

    const closeBtn = this.buildCloseButton(panelX + PANEL_W / 2, panelY + PANEL_H - 52);
    this.panel.addChild(closeBtn);
    this.closeBtn = closeBtn;
  }

  private buildCloseButton(cx: number, cy: number): Container {
    const c = new Container();
    const W = 120;
    const H = 40;
    const R = 10;

    const bg = new Graphics();
    bg.roundRect(-W / 2, -H / 2, W, H, R);
    bg.fill({ color: 0x4488aa, alpha: 0.9 });
    bg.roundRect(-W / 2, -H / 2, W, H, R);
    bg.stroke({ width: 1, color: 0x66aacc, alpha: 0.8 });
    c.addChild(bg);

    const label = new Text({
      text: "Got it",
      style: {
        fill: 0xffffff,
        fontSize: 16,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
      },
    });
    label.anchor.set(0.5);
    c.addChild(label);

    c.x = cx;
    c.y = cy;
    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointerdown", () => this.hide());
    c.on("pointerover", () => { bg.tint = 0xbbddff; });
    c.on("pointerout", () => { bg.tint = 0xffffff; });

    return c;
  }
}
