import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import type { RunState } from "../../sim/runtime/RunState";
import { rollUpgradeChoices } from "../../content/upgrades/upgradePool";
import { ARTIFACT_DEFS } from "../../content/artifacts/artifactDefs";
import { TUNING } from "../../content/tuning";
import type { UpgradeChoice, UpgradeRarity } from "../../content/upgrades/upgradeTypes";
import type { ArtifactDef } from "../../content/artifacts/artifactTypes";

const CARD_W = 220;
const CARD_H = 170;
const CARD_GAP = 20;
const COLS = 3;

const RARITY_PRICE: Record<UpgradeRarity, number> = {
  common: TUNING.merchant.upgradePriceCommon,
  rare: TUNING.merchant.upgradePriceRare,
  epic: TUNING.merchant.upgradePriceEpic,
};

const RARITY_COLORS: Record<UpgradeRarity, number> = {
  common: 0x6688aa,
  rare: 0x4488ff,
  epic: 0xcc44ff,
};

type ShopItem = {
  type: "upgrade" | "artifact";
  upgradeChoice?: UpgradeChoice;
  artifactDef?: ArtifactDef;
  price: number;
  purchased: boolean;
};

export class MerchantScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();
  private bg: Sprite | null = null;
  private goldText!: Text;
  private cards: Container[] = [];
  private cardBgs: Graphics[] = [];
  private items: ShopItem[] = [];
  private runState!: RunState;

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  async enter(): Promise<void> {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    this.runState = this.scenes.data.runState as RunState;

    const w = app.renderer.width;
    const h = app.renderer.height;

    try {
      const tex = await Assets.load<Texture>("/merchant_mockup.png");
      this.bg = new Sprite(tex);
      this.coverFit(w, h);
      this.root.addChildAt(this.bg, 0);
    } catch {
      const fallback = new Graphics();
      fallback.rect(0, 0, w, h);
      fallback.fill({ color: 0x0a0a1a });
      this.root.addChildAt(fallback, 0);
    }

    const dimOverlay = new Graphics();
    dimOverlay.rect(0, 0, w, h);
    dimOverlay.fill({ color: 0x000000, alpha: 0.45 });
    this.root.addChild(dimOverlay);

    const title = new Text({
      text: "MERCHANT",
      style: {
        fill: 0xffd870,
        fontSize: 36,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 4,
        dropShadow: {
          color: 0x000000,
          blur: 6,
          distance: 2,
          angle: Math.PI / 3,
        },
      },
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = 30;
    this.root.addChild(title);

    this.goldText = new Text({
      text: `Gold: ${this.runState.gold}`,
      style: {
        fill: 0xffe066,
        fontSize: 24,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
      },
    });
    this.goldText.anchor.set(1, 0);
    this.goldText.x = w - 30;
    this.goldText.y = 36;
    this.root.addChild(this.goldText);

    if (this.runState.appliedArtifacts.size > 0) {
      const owned = [...this.runState.appliedArtifacts].join(", ");
      const ownedLabel = new Text({
        text: `Owned: ${owned}`,
        style: {
          fill: 0xaaaacc,
          fontSize: 12,
          fontFamily: "system-ui",
        },
      });
      ownedLabel.anchor.set(1, 0);
      ownedLabel.x = w - 30;
      ownedLabel.y = 64;
      this.root.addChild(ownedLabel);
    }

    this.generateShop();
    this.buildCards(w, h);
    this.buildContinueButton(w, h);
  }

  exit(): void {}

  update(_dt: number): void {
    if (this.goldText) {
      this.goldText.text = `Gold: ${this.runState.gold}`;
    }
  }

  private generateShop() {
    this.items = [];
    const rng = this.runState.rng;

    const choices = rollUpgradeChoices(
      rng,
      this.runState.appliedUpgrades,
      4,
      this.runState.weaponLoadout
    );
    for (const c of choices) {
      this.items.push({
        type: "upgrade",
        upgradeChoice: c,
        price: RARITY_PRICE[c.def.rarity],
        purchased: false,
      });
    }

    const available = ARTIFACT_DEFS.filter(
      (a) => !this.runState.appliedArtifacts.has(a.id)
    );
    const shuffled = rng.shuffle([...available]);
    for (let i = 0; i < Math.min(2, shuffled.length); i++) {
      this.items.push({
        type: "artifact",
        artifactDef: shuffled[i],
        price: shuffled[i].goldCost,
        purchased: false,
      });
    }
  }

  private buildCards(viewW: number, viewH: number) {
    for (const c of this.cards) {
      this.root.removeChild(c);
      c.destroy();
    }
    this.cards = [];
    this.cardBgs = [];

    const rows = Math.ceil(this.items.length / COLS);
    const totalW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const totalH = rows * CARD_H + (rows - 1) * CARD_GAP;
    const startX = (viewW - totalW) / 2;
    const startY = (viewH - totalH) / 2 - 10;

    for (let i = 0; i < this.items.length; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const card = this.buildCard(this.items[i], i);
      card.x = startX + col * (CARD_W + CARD_GAP);
      card.y = startY + row * (CARD_H + CARD_GAP);
      this.root.addChild(card);
      this.cards.push(card);
    }
  }

  private buildCard(item: ShopItem, index: number): Container {
    const c = new Container();
    const isArtifact = item.type === "artifact";
    const borderColor = isArtifact ? 0xffd870 : this.rarityColor(item);
    const affordable = this.runState.gold >= item.price;

    const bg = new Graphics();
    bg.roundRect(0, 0, CARD_W, CARD_H, 12);
    bg.fill({ color: 0x12122a, alpha: 0.92 });
    bg.roundRect(0, 0, CARD_W, CARD_H, 12);
    bg.stroke({ width: 2, color: borderColor, alpha: affordable ? 0.8 : 0.3 });
    c.addChild(bg);
    this.cardBgs.push(bg);

    if (isArtifact) {
      const accentBar = new Graphics();
      accentBar.roundRect(2, 2, CARD_W - 4, 4, 2);
      accentBar.fill({ color: 0xffd870, alpha: 0.7 });
      c.addChild(accentBar);
    } else {
      const accentBar = new Graphics();
      accentBar.roundRect(2, 2, CARD_W - 4, 4, 2);
      accentBar.fill({ color: borderColor, alpha: 0.6 });
      c.addChild(accentBar);
    }

    const typeLabel = new Text({
      text: isArtifact ? "ARTIFACT" : "UPGRADE",
      style: {
        fill: isArtifact ? 0xffd870 : 0x88aacc,
        fontSize: 10,
        fontFamily: "system-ui",
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    typeLabel.x = 10;
    typeLabel.y = 12;
    c.addChild(typeLabel);

    const name = new Text({
      text: isArtifact
        ? item.artifactDef!.name
        : item.upgradeChoice!.def.name,
      style: {
        fill: 0xffffff,
        fontSize: 16,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        wordWrap: true,
        wordWrapWidth: CARD_W - 24,
      },
    });
    name.x = 10;
    name.y = 30;
    c.addChild(name);

    const desc = new Text({
      text: isArtifact
        ? item.artifactDef!.description
        : item.upgradeChoice!.def.description,
      style: {
        fill: 0x9999bb,
        fontSize: 12,
        fontFamily: "system-ui, sans-serif",
        wordWrap: true,
        wordWrapWidth: CARD_W - 24,
      },
    });
    desc.x = 10;
    desc.y = 60;
    c.addChild(desc);

    const priceText = new Text({
      text: `${item.price} gold`,
      style: {
        fill: affordable ? 0xffe066 : 0xff4444,
        fontSize: 14,
        fontFamily: "system-ui",
        fontWeight: "bold",
      },
    });
    priceText.anchor.set(1, 1);
    priceText.x = CARD_W - 10;
    priceText.y = CARD_H - 8;
    c.addChild(priceText);

    if (!isArtifact && item.upgradeChoice!.currentStacks > 0) {
      const stack = new Text({
        text: `x${item.upgradeChoice!.currentStacks + 1}`,
        style: { fill: borderColor, fontSize: 12, fontFamily: "system-ui" },
      });
      stack.x = 10;
      stack.y = CARD_H - 22;
      c.addChild(stack);
    }

    c.eventMode = "static";
    c.cursor = affordable ? "pointer" : "not-allowed";
    c.on("pointerdown", () => this.purchaseItem(index));
    c.on("pointerover", () => {
      if (!this.items[index].purchased && this.runState.gold >= item.price) {
        bg.tint = 0xccccff;
      }
    });
    c.on("pointerout", () => {
      bg.tint = 0xffffff;
    });

    if (!affordable) {
      c.alpha = 0.5;
    }

    return c;
  }

  private purchaseItem(index: number) {
    const item = this.items[index];
    if (!item || item.purchased) return;

    if (this.runState.gold < item.price) {
      const card = this.cards[index];
      if (card) {
        const origX = card.x;
        let count = 0;
        const shake = () => {
          count++;
          card.x = origX + (count % 2 === 0 ? 4 : -4);
          if (count < 6) requestAnimationFrame(shake);
          else card.x = origX;
        };
        shake();
      }
      return;
    }

    this.runState.gold -= item.price;
    item.purchased = true;

    if (item.type === "upgrade" && item.upgradeChoice) {
      this.runState.applyUpgrade(item.upgradeChoice.def.id);
    } else if (item.type === "artifact" && item.artifactDef) {
      this.runState.appliedArtifacts.add(item.artifactDef.id);
      if (item.artifactDef.id === "extra_rocket") {
        this.runState.rocketsRemaining++;
      }
      this.runState.recomputeStats();
    }

    const card = this.cards[index];
    if (card) {
      card.alpha = 0.3;
      card.eventMode = "none";
    }

    this.updateCardAffordability();
  }

  private updateCardAffordability() {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const card = this.cards[i];
      if (!card || item.purchased) continue;

      const affordable = this.runState.gold >= item.price;
      card.alpha = affordable ? 1 : 0.5;
      card.cursor = affordable ? "pointer" : "not-allowed";
    }
  }

  private rarityColor(item: ShopItem): number {
    if (item.type !== "upgrade" || !item.upgradeChoice) return 0x6688aa;
    return RARITY_COLORS[item.upgradeChoice.def.rarity];
  }

  private buildContinueButton(viewW: number, viewH: number) {
    const btn = new Container();
    const W = 200;
    const H = 50;
    const R = 14;

    const bg = new Graphics();
    bg.roundRect(-W / 2, -H / 2, W, H, R);
    bg.fill({ color: 0x2244aa });
    bg.roundRect(-W / 2, -H / 2, W, H, R);
    bg.stroke({ width: 2, color: 0x4488ff, alpha: 0.8 });
    btn.addChild(bg);

    const label = new Text({
      text: "CONTINUE",
      style: {
        fill: 0xffffff,
        fontSize: 20,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 2,
      },
    });
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.x = viewW / 2;
    btn.y = viewH - 60;
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      this.scenes.switchTo("run");
    });
    btn.on("pointerover", () => {
      bg.tint = 0xccccff;
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
    });

    this.root.addChild(btn);
  }

  private coverFit(viewW: number, viewH: number) {
    if (!this.bg) return;
    const tex = this.bg.texture;
    const scale = Math.max(viewW / tex.width, viewH / tex.height);
    this.bg.scale.set(scale);
    this.bg.x = (viewW - tex.width * scale) / 2;
    this.bg.y = (viewH - tex.height * scale) / 2;
  }
}
