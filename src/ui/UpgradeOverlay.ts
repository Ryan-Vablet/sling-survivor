import { Container, Graphics, Text } from "pixi.js";
import type {
  UpgradeChoice,
  UpgradeRarity,
} from "../content/upgrades/upgradeTypes";

const RARITY_COLORS: Record<UpgradeRarity, number> = {
  common: 0x6688aa,
  rare: 0x4488ff,
  epic: 0xcc44ff,
};

const CARD_W = 240;
const CARD_H = 160;
const CARD_GAP = 24;

export class UpgradeOverlay {
  root = new Container();

  private backdrop = new Graphics();
  private panel = new Container();
  private choices: UpgradeChoice[] = [];
  private onPick: ((id: string) => void) | null = null;
  private kbHandler: ((e: KeyboardEvent) => void) | null = null;
  /** When set, overlay is in replay mode: no pick, highlight this card as chosen. */
  private pickedIndex: number | null = null;

  constructor() {
    this.root.visible = false;
    this.root.addChild(this.backdrop, this.panel);
  }

  show(
    choices: UpgradeChoice[],
    viewW: number,
    viewH: number,
    onPick: (id: string) => void,
    options?: { pickedIndex?: number }
  ) {
    this.choices = choices;
    this.onPick = onPick;
    this.pickedIndex = options?.pickedIndex ?? null;
    this.root.visible = true;
    this.build(viewW, viewH);

    if (this.pickedIndex == null) {
      this.kbHandler = (e: KeyboardEvent) => {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < this.choices.length) {
          this.pick(idx);
        }
      };
      window.addEventListener("keydown", this.kbHandler);
    }
  }

  hide() {
    this.root.visible = false;
    this.panel.removeChildren();
    if (this.kbHandler) {
      window.removeEventListener("keydown", this.kbHandler);
      this.kbHandler = null;
    }
    this.onPick = null;
    this.pickedIndex = null;
  }

  layout(viewW: number, viewH: number) {
    if (this.root.visible && this.choices.length > 0) {
      this.build(viewW, viewH);
    }
  }

  private pick(index: number) {
    const choice = this.choices[index];
    if (!choice) return;
    const cb = this.onPick;
    this.hide();
    cb?.(choice.def.id);
  }

  private build(viewW: number, viewH: number) {
    this.panel.removeChildren();

    this.backdrop.clear();
    this.backdrop.rect(0, 0, viewW, viewH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.65 });
    this.backdrop.eventMode = "static";

    const title = new Text({
      text: "CHOOSE AN UPGRADE",
      style: {
        fill: 0xffffff,
        fontSize: 26,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 2,
      },
    });
    title.anchor.set(0.5);
    title.x = viewW / 2;
    title.y = viewH / 2 - CARD_H / 2 - 48;
    this.panel.addChild(title);

    const totalW =
      this.choices.length * CARD_W + (this.choices.length - 1) * CARD_GAP;
    const startX = (viewW - totalW) / 2;
    const cardY = viewH / 2 - CARD_H / 2 + 10;

    for (let i = 0; i < this.choices.length; i++) {
      const card = this.buildCard(this.choices[i], i);
      card.x = startX + i * (CARD_W + CARD_GAP);
      card.y = cardY;
      this.panel.addChild(card);
    }
  }

  private buildCard(choice: UpgradeChoice, index: number): Container {
    const c = new Container();
    const col = RARITY_COLORS[choice.def.rarity];
    const isPicked = this.pickedIndex === index;

    const bg = new Graphics();
    bg.roundRect(0, 0, CARD_W, CARD_H, 12);
    bg.fill({ color: 0x12122a, alpha: 0.95 });
    bg.roundRect(0, 0, CARD_W, CARD_H, 12);
    bg.stroke({ width: 2, color: col, alpha: 0.8 });
    if (isPicked) {
      bg.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 14);
      bg.stroke({ width: 4, color: 0xffcc00, alpha: 0.95 });
    }
    c.addChild(bg);

    const bar = new Graphics();
    bar.roundRect(2, 2, CARD_W - 4, 4, 2);
    bar.fill({ color: col, alpha: 0.9 });
    c.addChild(bar);

    const hint = new Text({
      text: `[${index + 1}]`,
      style: { fill: 0xffffff, fontSize: 11, fontFamily: "system-ui" },
    });
    hint.x = 10;
    hint.y = 14;
    hint.alpha = 0.4;
    c.addChild(hint);

    const name = new Text({
      text: choice.def.name,
      style: {
        fill: 0xffffff,
        fontSize: 17,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        wordWrap: true,
        wordWrapWidth: CARD_W - 24,
      },
    });
    name.x = 12;
    name.y = 32;
    c.addChild(name);

    const desc = new Text({
      text: choice.def.description,
      style: {
        fill: 0x9999bb,
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        wordWrap: true,
        wordWrapWidth: CARD_W - 24,
      },
    });
    desc.x = 12;
    desc.y = 62;
    c.addChild(desc);

    if (choice.currentStacks > 0) {
      const stack = new Text({
        text: `x${choice.currentStacks + 1}`,
        style: { fill: col, fontSize: 14, fontFamily: "system-ui" },
      });
      stack.anchor.set(1, 1);
      stack.x = CARD_W - 10;
      stack.y = CARD_H - 8;
      c.addChild(stack);
    }

    if (this.pickedIndex == null) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointerdown", () => this.pick(index));
      c.on("pointerover", () => {
        bg.tint = 0xccccff;
      });
      c.on("pointerout", () => {
        bg.tint = 0xffffff;
      });
    }

    return c;
  }
}
