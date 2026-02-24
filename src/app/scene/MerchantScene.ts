import {
  AnimatedSprite,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import type { RunState } from "../../sim/runtime/RunState";
import { rollUpgradeChoices } from "../../content/upgrades/upgradePool";
import { ARTIFACT_DEFS } from "../../content/artifacts/artifactDefs";
import { TUNING } from "../../content/tuning";
import type {
  UpgradeChoice,
  UpgradeRarity,
} from "../../content/upgrades/upgradeTypes";
import type { ArtifactDef } from "../../content/artifacts/artifactTypes";
import { assetUrl } from "../../render/assets";

const CARD_W = 220;
const CARD_H = 170;
const CARD_GAP = 20;
const COLS = 3;
const COIN_FRAMES = 8;

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

  private elapsed = 0;
  private continueBtn!: Container;
  private continueBtnBaseY = 0;
  private viewW = 0;
  private viewH = 0;
  private goldContainer!: Container;
  private dimOverlay!: Graphics;
  private rerollBtn!: Container;

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  async enter(): Promise<void> {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    this.runState = this.scenes.data.runState as RunState;

    this.viewW = app.renderer.width;
    this.viewH = app.renderer.height;
    const w = this.viewW;
    const h = this.viewH;

    try {
      const tex = await Assets.load<Texture>(assetUrl("/merchant_mockup.png"));
      this.bg = new Sprite(tex);
      this.coverFit(w, h);
      this.root.addChildAt(this.bg, 0);
    } catch {
      const fallback = new Graphics();
      fallback.rect(0, 0, w, h);
      fallback.fill({ color: 0x0a0a1a });
      this.root.addChildAt(fallback, 0);
    }

    this.dimOverlay = new Graphics();
    this.dimOverlay.rect(0, 0, w, h);
    this.dimOverlay.fill({ color: 0x000000, alpha: 0.45 });
    this.root.addChild(this.dimOverlay);

    await this.buildGoldDisplay(w);

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
    this.buildRerollButton(w, h);
    this.buildContinueButton(w, h);
  }

  exit(): void {}

  update(dt: number): void {
    this.elapsed += dt;

    if (this.goldText) {
      this.goldText.text = `${this.runState.gold} gold`;
    }

    if (this.continueBtn) {
      const bob = Math.sin(this.elapsed * 1.6) * 8;
      const drift = Math.sin(this.elapsed * 2.9) * 2.5;
      this.continueBtn.y = this.continueBtnBaseY + bob + drift;

      const pulse = 1.0 + Math.sin(this.elapsed * 2.2) * 0.015;
      this.continueBtn.scale.set(pulse);

      this.continueBtn.rotation = Math.sin(this.elapsed * 1.1) * 0.015;
    }
  }

  private async buildGoldDisplay(viewW: number) {
    this.goldContainer = new Container();

    try {
      const sheetTex = await Assets.load<Texture>(assetUrl("/coin_flip_sheet.png"));
      const frameW = sheetTex.width / COIN_FRAMES;
      const frameH = sheetTex.height;
      const frames: Texture[] = [];
      for (let i = 0; i < COIN_FRAMES; i++) {
        frames.push(
          new Texture({
            source: sheetTex.source,
            frame: new Rectangle(i * frameW, 0, frameW, frameH),
          })
        );
      }
      const coinSprite = new AnimatedSprite(frames);
      coinSprite.width = 28;
      coinSprite.height = 28;
      coinSprite.anchor.set(0.5);
      coinSprite.animationSpeed = 0.18;
      coinSprite.play();
      coinSprite.x = -18;
      coinSprite.y = 0;
      goldContainer.addChild(coinSprite);
    } catch {
      // no coin sprite, text only
    }

    this.goldText = new Text({
      text: `${this.runState.gold} gold`,
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
      },
    });
    this.goldText.anchor.set(0, 0.5);
    this.goldText.x = 0;
    this.goldText.y = 0;
    this.goldContainer.addChild(this.goldText);

    this.goldContainer.x = viewW - 30 - this.goldText.width;
    this.goldContainer.y = 40;
    this.root.addChild(this.goldContainer);
  }

  private generateShop() {
    this.items = [];
    const rng = this.runState.rng;

    const choices = rollUpgradeChoices(
      rng,
      this.runState.appliedUpgrades,
      3,
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
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
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

    const totalW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const totalH = 2 * CARD_H + CARD_GAP;
    const startX = (viewW - totalW) / 2;
    const startY = (viewH - totalH) / 2 - 20;

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
    bg.stroke({
      width: 2,
      color: borderColor,
      alpha: affordable ? 0.8 : 0.3,
    });
    c.addChild(bg);
    this.cardBgs.push(bg);

    const accentBar = new Graphics();
    accentBar.roundRect(2, 2, CARD_W - 4, 4, 2);
    accentBar.fill({
      color: isArtifact ? 0xffd870 : borderColor,
      alpha: isArtifact ? 0.7 : 0.6,
    });
    c.addChild(accentBar);

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

  private rerollShop() {
    this.generateShop();
    this.buildCards(this.viewW, this.viewH);
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

  private buildRerollButton(viewW: number, viewH: number) {
    const btn = new Container();
    const S = 38;

    const bg = new Graphics();
    bg.roundRect(-S / 2, -S / 2, S, S, 10);
    bg.fill({ color: 0x1a1a3a, alpha: 0.9 });
    bg.roundRect(-S / 2, -S / 2, S, S, 10);
    bg.stroke({ width: 1.5, color: 0x556688, alpha: 0.6 });
    btn.addChild(bg);

    const arrow = new Graphics();
    const r = 8;
    const cx = 0;
    const cy = 0;
    const segments = 20;
    const startAngle = -Math.PI * 0.15;
    const endAngle = Math.PI * 1.45;

    arrow.moveTo(
      cx + Math.cos(startAngle) * r,
      cy + Math.sin(startAngle) * r
    );
    for (let i = 1; i <= segments; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / segments;
      arrow.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    arrow.stroke({ width: 2.5, color: 0x88aacc, alpha: 0.9 });

    const tipAngle = endAngle;
    const tipX = cx + Math.cos(tipAngle) * r;
    const tipY = cy + Math.sin(tipAngle) * r;
    const arrowLen = 5;
    arrow.moveTo(tipX, tipY);
    arrow.lineTo(
      tipX + Math.cos(tipAngle + 0.6) * arrowLen,
      tipY + Math.sin(tipAngle + 0.6) * arrowLen
    );
    arrow.moveTo(tipX, tipY);
    arrow.lineTo(
      tipX + Math.cos(tipAngle - 1.2) * arrowLen,
      tipY + Math.sin(tipAngle - 1.2) * arrowLen
    );
    arrow.stroke({ width: 2.5, color: 0x88aacc, alpha: 0.9 });

    btn.addChild(arrow);

    const totalW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const gridStartX = (viewW - totalW) / 2;
    const totalH = 2 * CARD_H + CARD_GAP;
    const gridStartY = (viewH - totalH) / 2 - 20;

    btn.x = gridStartX + totalW - S / 2 + 4;
    btn.y = gridStartY + totalH + 14 + S / 2;

    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.on("pointerdown", () => this.rerollShop());
    btn.on("pointerover", () => {
      bg.tint = 0xaaccff;
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
    });

    this.rerollBtn = btn;
    this.root.addChild(btn);
  }

  private buildContinueButton(viewW: number, viewH: number) {
    const btn = new Container();
    const W = 230;
    const H = 68;
    const R = 18;

    const glow = new Graphics();
    glow.roundRect(-W / 2 - 14, -H / 2 - 14, W + 28, H + 28, R + 12);
    glow.fill({ color: 0x4080ff, alpha: 0.18 });
    glow.roundRect(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16, R + 6);
    glow.fill({ color: 0x4080ff, alpha: 0.12 });
    btn.addChild(glow);

    const base = new Graphics();
    base.roundRect(-W / 2 + 2, -H / 2 + 4, W, H, R);
    base.fill({ color: 0x0a1e4a, alpha: 0.7 });
    btn.addChild(base);

    const body = new Graphics();
    body.roundRect(-W / 2, -H / 2, W, H, R);
    body.fill({ color: 0x2855b0 });
    btn.addChild(body);

    const hi = new Graphics();
    hi.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H * 0.4, R - 4);
    hi.fill({ color: 0x5588dd, alpha: 0.55 });
    btn.addChild(hi);

    const lo = new Graphics();
    lo.roundRect(-W / 2 + 4, H / 2 - H * 0.35, W - 8, H * 0.3, R - 4);
    lo.fill({ color: 0x1a3870, alpha: 0.35 });
    btn.addChild(lo);

    const rim = new Graphics();
    rim.roundRect(-W / 2, -H / 2, W, H, R);
    rim.stroke({ width: 2.5, color: 0x88bbff, alpha: 0.85 });
    btn.addChild(rim);

    const inset = new Graphics();
    inset.roundRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6, R - 2);
    inset.stroke({ width: 1, color: 0xb0d0ff, alpha: 0.3 });
    btn.addChild(inset);

    const label = new Text({
      text: "CONTINUE",
      style: {
        fill: 0xf0f4ff,
        fontSize: 30,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 3,
        dropShadow: {
          color: 0x0a1844,
          blur: 3,
          distance: 2,
          angle: Math.PI / 3,
        },
      },
    });
    label.anchor.set(0.5);
    label.y = -1;
    btn.addChild(label);

    btn.x = viewW / 2;
    btn.y = viewH - 70;
    this.continueBtnBaseY = btn.y;
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      this.scenes.switchTo("run");
    });

    this.continueBtn = btn;
    this.root.addChild(btn);
  }

  /** Scale background to fit viewport and align so the top is visible. */
  private coverFit(viewW: number, viewH: number) {
    if (!this.bg) return;
    const tex = this.bg.texture;
    const scale = Math.min(viewW / tex.width, viewH / tex.height);
    this.bg.scale.set(scale);
    this.bg.x = (viewW - tex.width * scale) / 2;
    this.bg.y = 0;
  }

  resize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
    this.coverFit(w, h);
    this.dimOverlay.clear();
    this.dimOverlay.rect(0, 0, w, h);
    this.dimOverlay.fill({ color: 0x000000, alpha: 0.45 });
    this.goldContainer.x = w - 30 - this.goldText.width;
    this.goldContainer.y = 40;
    const totalW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const totalH = 2 * CARD_H + CARD_GAP;
    const startX = (w - totalW) / 2;
    const startY = (h - totalH) / 2 - 20;
    for (let i = 0; i < this.cards.length; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      this.cards[i].x = startX + col * (CARD_W + CARD_GAP);
      this.cards[i].y = startY + row * (CARD_H + CARD_GAP);
    }
    this.rerollBtn.x = startX + totalW - 38 / 2 + 4;
    this.rerollBtn.y = startY + totalH + 14 + 38 / 2;
    this.continueBtn.x = w / 2;
    this.continueBtn.y = h - 70;
    this.continueBtnBaseY = this.continueBtn.y;
  }
}
