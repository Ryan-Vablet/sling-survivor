import { Assets, Container, Sprite, Text, Graphics } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { computeRunScore, type RunSummaryData } from "../types/runSummary";
import { assetUrl } from "../../render/assets";

/**
 * Run-end summary scene. Shows placeholder image + run stats (build, distance, scrap, gold, etc.).
 * Enter from game over (with full data) or from leaderboard "View summary" (with stored or minimal data).
 * Click to continue → title.
 */
export class SummaryScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();
  private bgSprite: Sprite | null = null;
  private panel!: Graphics;
  private titleText!: Text;
  private statsText!: Text;
  private highScoreText: Text | null = null;
  private continueText!: Text;
  private clickHandler: (() => void) | null = null;
  private elapsed = 0;

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  enter(): void {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    const data = this.scenes.data.summaryData as RunSummaryData | undefined;
    const summary = data ?? this.getEmptySummary();

    const w = app.renderer.width;
    const h = app.renderer.height;

    this.panel = new Graphics();
    this.root.addChild(this.panel);

    this.titleText = new Text({
      text: "Run Summary",
      style: { fill: 0xffcc88, fontSize: 24, fontFamily: "system-ui", fontWeight: "bold" },
    });
    this.titleText.anchor.set(0.5, 0);
    this.root.addChild(this.titleText);

    const score = summary.score ?? computeRunScore(summary);
    const lines: string[] = [
      `Score: ${score.toLocaleString()}`,
      `Distance: ${Math.round(summary.distanceM)} m`,
      `Scrap earned: ${summary.scrap}`,
      `Gold (end): ${summary.gold} · Gold earned: ${summary.totalGoldEarned}`,
      `Round: ${summary.round}`,
      `Total kills: ${summary.totalKills}`,
      `Level: ${summary.level}`,
    ];
    if (summary.upgrades.length > 0) {
      lines.push("", "Upgrades:");
      summary.upgrades.forEach(([id, n]) => lines.push(`  ${id} ×${n}`));
    }
    if (summary.evolutions.length > 0) {
      lines.push("", "Evolutions:");
      summary.evolutions.forEach((id) => lines.push(`  ${id}`));
    }
    if (summary.artifacts.length > 0) {
      lines.push("", "Artifacts:");
      summary.artifacts.forEach((id) => lines.push(`  ${id}`));
    }

    this.statsText = new Text({
      text: lines.join("\n"),
      style: { fill: 0xccccdd, fontSize: 16, fontFamily: "system-ui", lineHeight: 22 },
    });
    this.statsText.anchor.set(0.5, 0);
    this.root.addChild(this.statsText);

    const hsa = summary.highScoreAchieved;
    if (hsa) {
      const label =
        hsa.local && hsa.global
          ? "New Local & Global High Score"
          : hsa.local
            ? "New Local High Score"
            : "New Global High Score";
      this.highScoreText = new Text({
        text: `${label} — ${hsa.initials} · ${hsa.distance.toLocaleString()} m`,
        style: {
          fill: 0xffdd88,
          fontSize: 15,
          fontFamily: "system-ui",
          fontWeight: "bold",
          dropShadow: { color: 0x886622, blur: 8, distance: 0, alpha: 0.9 },
        },
      });
      this.highScoreText.anchor.set(0.5, 0);
      this.root.addChild(this.highScoreText);
    } else {
      this.highScoreText = null;
    }

    this.continueText = new Text({
      text: "Click to continue",
      style: { fill: 0x88aacc, fontSize: 14, fontFamily: "system-ui" },
    });
    this.continueText.anchor.set(0.5, 0);
    this.root.addChild(this.continueText);

    this.layout(w, h);

    // Placeholder image (merchant_mockup.png — replace with your asset)
    this.bgSprite = new Sprite();
    this.root.addChildAt(this.bgSprite, 0);
    Assets.load(assetUrl("/assets/merchant_mockup.png"))
      .then((tex) => {
        if (this.bgSprite) {
          this.bgSprite.texture = tex;
          this.coverPlaceholder(w, h);
        }
      })
      .catch(() => {
        // Placeholder image missing; summary panel still shows
      });

    this.clickHandler = () => {
      if (this.clickHandler) {
        app.canvas.removeEventListener("pointerdown", this.clickHandler);
        this.clickHandler = null;
      }
      this.scenes.data.summaryData = undefined;
      this.scenes.switchTo("title");
    };
    app.canvas.addEventListener("pointerdown", this.clickHandler);
  }

  resize(w: number, h: number): void {
    this.layout(w, h);
    this.coverPlaceholder(w, h);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.highScoreText) {
      const pulse = 0.94 + 0.06 * Math.sin(this.elapsed * 3.5);
      this.highScoreText.scale.set(pulse);
      this.highScoreText.alpha = 0.88 + 0.12 * Math.sin(this.elapsed * 2.2);
    }
  }

  exit(): void {
    const app = this.scenes.getApp();
    if (this.clickHandler) {
      app.canvas.removeEventListener("pointerdown", this.clickHandler);
      this.clickHandler = null;
    }
    this.scenes.getApp().stage.removeChild(this.root);
  }

  private getEmptySummary(): RunSummaryData {
    return {
      initials: "???",
      distanceM: 0,
      scrap: 0,
      gold: 0,
      totalGoldEarned: 0,
      round: 0,
      totalKills: 0,
      level: 0,
      upgrades: [],
      evolutions: [],
      artifacts: [],
    };
  }

  private layout(w: number, h: number) {
    const panelW = Math.min(480, w * 0.9);
    const panelH = Math.min(520, h * 0.85);
    const pad = 24;

    this.panel.clear();
    this.panel.roundRect(0, 0, panelW, panelH, 20).fill({ color: 0x0d0d1a, alpha: 0.96 });
    this.panel.stroke({ width: 2, color: 0x4488aa, alpha: 0.7 });
    this.panel.x = (w - panelW) / 2;
    this.panel.y = (h - panelH) / 2;

    const cx = w / 2;
    const topY = this.panel.y + pad + 60;

    this.titleText.x = cx;
    this.titleText.y = topY;

    this.statsText.x = cx;
    this.statsText.y = topY + 44;

    if (this.highScoreText) {
      this.highScoreText.x = cx;
      this.highScoreText.y = this.panel.y + panelH - pad - 56;
    }
    this.continueText.x = cx;
    this.continueText.y = this.panel.y + panelH - pad - 28;
  }

  private coverPlaceholder(viewW: number, viewH: number) {
    if (!this.bgSprite?.texture) return;
    const tex = this.bgSprite.texture;
    const scale = Math.max(viewW / tex.width, viewH / tex.height);
    this.bgSprite.scale.set(scale);
    this.bgSprite.x = (viewW - tex.width * scale) / 2;
    this.bgSprite.y = (viewH - tex.height * scale) / 2;
    this.bgSprite.alpha = 0.25;
  }
}
