import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { Layers } from "../../render/layers";
import { Camera2D } from "../../render/Camera2D";
import { assetUrl, getRocketTexture, getUfoTexture, loadAssets } from "../../render/assets";
import { TUNING } from "../../content/tuning";
import { PhysicsWorld } from "../../sim/world/PhysicsWorld";
import { Hud } from "../../ui/Hud";
import { EndScreen } from "../../ui/EndScreen";
import { UpgradeOverlay } from "../../ui/UpgradeOverlay";
import { UPGRADE_DEFS } from "../../content/upgrades/upgradeDefs";
import type { UpgradeChoice } from "../../content/upgrades/upgradeTypes";
import type {
  ReplayData,
  ReplaySnapshot,
  ReplaySnapshotPlayer,
  ReplaySnapshotDrone,
  ReplaySnapshotCoin,
  ReplaySnapshotRunState,
  ReplayEvent,
} from "../replay/replayTypes";
import { fetchReplay } from "../replay/fetchReplay";

const STAR_TILE_W = 2000;
const STAR_TILE_H = 1200;
const STAR_COUNT = 140;
const ROCKET_SPRITE_SCALE = 0.133;
const UFO_BASE_SCALE = 0.25;
const COIN_FRAMES = 8;
const UPGRADE_DISPLAY_DURATION = 2.5;

type Star = { x: number; y: number; a: number; r: number; p: number };

type UpgradeReplayItem = {
  showAt: number;
  choiceIds: [string, string, string];
  pickedIndex: number;
};

export class ReplayScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();
  private layers = new Layers();
  private cam!: Camera2D;
  private world = new PhysicsWorld();
  private hud = new Hud();
  private end = new EndScreen();
  private upgradeOverlay = new UpgradeOverlay();

  private gfxWorld = new Graphics();
  private gfxDebug = new Graphics();
  private speedLabel = new Text({
    text: "Speed: 1x (S)",
    style: { fill: 0x88aacc, fontSize: 12, fontFamily: "system-ui" },
  });
  private rocketSprite: Sprite | null = null;
  private droneContainer = new Container();
  private droneSprites = new Map<number, Sprite>();
  private coinContainer = new Container();
  private coinSprites = new Map<number, AnimatedSprite>();
  private coinFrames: Texture[] = [];
  private coinAnimT = 0;

  private stars: Star[] = [];
  private loadingEl: HTMLElement | null = null;
  private replayData: ReplayData | null = null;
  private replayTime = 0;
  private duration = 0;
  private snapshots: ReplaySnapshot[] = [];
  private upgradeQueue: UpgradeReplayItem[] = [];
  private eventIndex = 0;
  private upgradeShowT = -1;
  /** Real time (s) when upgrade overlay should close. */
  private upgradeShowEndRealT = -1;
  private gameOverShown = false;
  private endClickHandler: (() => void) | null = null;
  /** Playback speed multiplier (1 or 2). */
  private playbackSpeed = 1;
  private speedKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Interpolated state (updated each frame). */
  private player: ReplaySnapshotPlayer = {
    pos: { x: TUNING.launcher.originX, y: TUNING.launcher.originY },
    vel: { x: 0, y: 0 },
    launched: false,
    boost: 0,
    hp: 0,
    kills: 0,
  };
  private drones: ReplaySnapshotDrone[] = [];
  private coins: ReplaySnapshotCoin[] = [];
  private runState: ReplaySnapshotRunState = {
    scrap: 0,
    gold: 0,
    round: 0,
    level: 0,
    distanceM: 0,
  };

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  async enter(): Promise<void> {
    const app = this.scenes.getApp();
    let data = this.scenes.data.replayData as ReplayData | undefined;
    const url = this.scenes.data.replayUrl as string | undefined;

    if (url && !data) {
      this.showLoading();
      const fetched = await fetchReplay(url);
      this.hideLoading();
      if (fetched) {
        this.scenes.data.replayData = fetched;
        data = fetched;
      }
    }

    const replayData = data ?? null;
    if (!replayData || !replayData.snapshots.length) {
      this.scenes.data.replayUrl = undefined;
      this.scenes.data.replayData = undefined;
      this.scenes.switchTo("title");
      return;
    }

    // Replay playback runs in RunScene (same renderer as live gameplay). ReplayScene is load-only.
    this.scenes.data.replayData = replayData;
    this.scenes.switchTo("run");
  }

  resize(w: number, h: number): void {
    this.hud.resize(w);
    this.end.layout(w, h);
    this.upgradeOverlay.layout(w, h);
    this.speedLabel.y = h - 28;
  }

  exit(): void {
    if (this.speedKeyHandler) {
      window.removeEventListener("keydown", this.speedKeyHandler);
      this.speedKeyHandler = null;
    }
    this.hideLoading();
    if (this.endClickHandler) {
      this.scenes.getApp().canvas.removeEventListener("pointerdown", this.endClickHandler);
    }
  }

  private showLoading(): void {
    const el = document.createElement("div");
    el.className = "replay-loading-overlay";
    el.setAttribute("aria-busy", "true");
    el.setAttribute("aria-label", "Loading replay");
    el.innerHTML = `
      <div class="replay-loading-spinner" aria-hidden="true"></div>
      <div class="replay-loading-text">Loading replay…</div>
    `;
    el.style.cssText =
      "position:fixed;inset:0;z-index:10003;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);color:#e8f4ff;font-family:system-ui,sans-serif;";
    const textEl = el.querySelector(".replay-loading-text") as HTMLElement;
    if (textEl) {
      textEl.style.marginTop = "16px";
      textEl.style.fontSize = "16px";
      textEl.style.letterSpacing = "0.05em";
    }
    const spinner = el.querySelector(".replay-loading-spinner") as HTMLElement;
    if (spinner) {
      spinner.style.cssText =
        "width:48px;height:48px;border:4px solid rgba(255,255,255,0.15);border-top-color:#66aaff;border-radius:50%;animation:replay-spin 0.7s linear infinite;";
    }
    if (!document.getElementById("replay-spin-style")) {
      const style = document.createElement("style");
      style.id = "replay-spin-style";
      style.textContent = "@keyframes replay-spin { to { transform: rotate(360deg); } }";
      document.head.appendChild(style);
    }
    document.body.appendChild(el);
    this.loadingEl = el;
  }

  private hideLoading(): void {
    if (this.loadingEl?.parentNode) {
      this.loadingEl.parentNode.removeChild(this.loadingEl);
    }
    this.loadingEl = null;
  }

  private buildUpgradeQueue(): UpgradeReplayItem[] {
    const queue: UpgradeReplayItem[] = [];
    const events = this.replayData?.events ?? [];
    const displays = events.filter((e): e is ReplayEvent & { type: "upgrade_display" } => e.type === "upgrade_display");
    const picks = events.filter((e): e is ReplayEvent & { type: "upgrade_pick" } => e.type === "upgrade_pick");
    for (let i = 0; i < displays.length; i++) {
      queue.push({
        showAt: displays[i].t,
        choiceIds: displays[i].choiceIds,
        pickedIndex: picks[i]?.index ?? 0,
      });
    }
    return queue;
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * STAR_TILE_W,
        y: Math.random() * STAR_TILE_H,
        a: 0.3 + Math.random() * 0.6,
        r: 1 + Math.random() * 1.5,
        p: 0.2 + Math.random() * 0.5,
      });
    }
  }

  private async loadCoinFrames(): Promise<void> {
    const { Assets } = await import("pixi.js");
    try {
      const sheetTex = await Assets.load<Texture>(assetUrl("/coin_flip_sheet.png"));
      const frameW = sheetTex.width / COIN_FRAMES;
      const frameH = sheetTex.height;
      this.coinFrames = [];
      for (let i = 0; i < COIN_FRAMES; i++) {
        this.coinFrames.push(
          new Texture({
            source: sheetTex.source,
            frame: new Rectangle(i * frameW, 0, frameW, frameH),
          })
        );
      }
    } catch {
      this.coinFrames = [];
    }
  }

  update(dt: number): void {
    if (!this.replayData) return;

    const app = this.scenes.getApp();
    const viewW = app.renderer.width;
    const viewH = app.renderer.height;

    if (this.gameOverShown) return;

    if (this.upgradeShowT >= 0 && performance.now() * 0.001 >= this.upgradeShowEndRealT) {
      this.upgradeOverlay.hide();
      this.upgradeShowT = -1;
    }

    if (this.upgradeShowT >= 0) {
      this.interpolate(this.replayTime);
      this.cam.follow(
        this.player.pos.x - viewW * 0.33,
        this.player.pos.y - viewH * 0.55
      );
      this.cam.update(dt);
      this.coinAnimT += dt;
      this.drawWorld(viewW, viewH);
      this.updateHud();
      return;
    }

    const nextUpgrade = this.upgradeQueue[0];
    if (nextUpgrade && this.replayTime >= nextUpgrade.showAt) {
      this.upgradeQueue.shift();
      const choices = this.choicesFromIds(nextUpgrade.choiceIds);
      if (choices.length >= 3) {
        this.upgradeOverlay.show(
          choices,
          viewW,
          viewH,
          () => {},
          { pickedIndex: nextUpgrade.pickedIndex }
        );
        this.upgradeShowT = this.replayTime;
        this.upgradeShowEndRealT = performance.now() * 0.001 + UPGRADE_DISPLAY_DURATION;
      }
    }

    while (this.eventIndex < (this.replayData.events?.length ?? 0)) {
      const ev = this.replayData.events[this.eventIndex];
      if (ev.t > this.replayTime) break;
      if (ev.type === "game_over") {
        this.gameOverShown = true;
        this.showEndOverlay();
        this.eventIndex++;
        return;
      }
      this.eventIndex++;
    }

    if (this.replayTime >= this.duration && !this.gameOverShown) {
      this.gameOverShown = true;
      this.showEndOverlay();
      return;
    }

    this.replayTime += dt * this.playbackSpeed;
    this.interpolate(this.replayTime);

    this.cam.follow(
      this.player.pos.x - viewW * 0.33,
      this.player.pos.y - viewH * 0.55
    );
    this.cam.update(dt);
    this.coinAnimT += dt;
    this.drawWorld(viewW, viewH);
    this.updateHud();
  }

  private choicesFromIds(ids: [string, string, string]): UpgradeChoice[] {
    const choices: UpgradeChoice[] = [];
    for (const id of ids) {
      const def = UPGRADE_DEFS.find((d) => d.id === id);
      if (def) {
        choices.push({ def, currentStacks: 0 });
      }
    }
    return choices;
  }

  private interpolate(t: number): void {
    if (this.snapshots.length === 0) return;
    if (t <= this.snapshots[0].t) {
      const s = this.snapshots[0];
      this.player = { ...s.player };
      this.drones = s.drones.map((d) => ({ ...d }));
      this.coins = s.coins.map((c) => ({ ...c }));
      this.runState = { ...s.runState };
      return;
    }
    if (t >= this.snapshots[this.snapshots.length - 1].t) {
      const s = this.snapshots[this.snapshots.length - 1];
      this.player = { ...s.player };
      this.drones = s.drones.map((d) => ({ ...d }));
      this.coins = s.coins.map((c) => ({ ...c }));
      this.runState = { ...s.runState };
      return;
    }
    let i = 0;
    while (i + 1 < this.snapshots.length && this.snapshots[i + 1].t <= t) i++;
    const a = this.snapshots[i];
    const b = this.snapshots[i + 1];
    const span = b.t - a.t;
    const f = span > 0 ? (t - a.t) / span : 1;

    this.player = {
      pos: {
        x: a.player.pos.x + (b.player.pos.x - a.player.pos.x) * f,
        y: a.player.pos.y + (b.player.pos.y - a.player.pos.y) * f,
      },
      vel: {
        x: a.player.vel.x + (b.player.vel.x - a.player.vel.x) * f,
        y: a.player.vel.y + (b.player.vel.y - a.player.vel.y) * f,
      },
      launched: b.player.launched,
      boost: a.player.boost + (b.player.boost - a.player.boost) * f,
      hp: a.player.hp + (b.player.hp - a.player.hp) * f,
      kills: b.player.kills,
    };

    const droneMap = new Map<number, ReplaySnapshotDrone>();
    for (const d of b.drones) {
      const prev = a.drones.find((x) => x.id === d.id);
      if (prev) {
        droneMap.set(d.id, {
          id: d.id,
          pos: {
            x: prev.pos.x + (d.pos.x - prev.pos.x) * f,
            y: prev.pos.y + (d.pos.y - prev.pos.y) * f,
          },
          vel: {
            x: prev.vel.x + (d.vel.x - prev.vel.x) * f,
            y: prev.vel.y + (d.vel.y - prev.vel.y) * f,
          },
          hp: d.hp,
          type: d.type,
          elite: d.elite,
        });
      } else {
        droneMap.set(d.id, { ...d });
      }
    }
    this.drones = [...droneMap.values()];

    const coinMap = new Map<number, ReplaySnapshotCoin>();
    for (const c of b.coins) {
      const prev = a.coins.find((x) => x.id === c.id);
      if (prev) {
        coinMap.set(c.id, {
          id: c.id,
          pos: {
            x: prev.pos.x + (c.pos.x - prev.pos.x) * f,
            y: prev.pos.y + (c.pos.y - prev.pos.y) * f,
          },
          alive: c.alive,
        });
      } else {
        coinMap.set(c.id, { ...c });
      }
    }
    this.coins = [...coinMap.values()];

    this.runState = {
      scrap: a.runState.scrap + (b.runState.scrap - a.runState.scrap) * f,
      gold: a.runState.gold + (b.runState.gold - a.runState.gold) * f,
      round: b.runState.round,
      level: b.runState.level,
      distanceM: a.runState.distanceM + (b.runState.distanceM - a.runState.distanceM) * f,
    };
  }

  private showEndOverlay(): void {
    const app = this.scenes.getApp();
    this.end.setText("Run complete\n\nClick to continue");
    if (!this.layers.ui.children.includes(this.end.root)) {
      this.layers.ui.addChild(this.end.root);
    }
    this.end.layout(app.renderer.width, app.renderer.height);
    this.endClickHandler = () => {
      app.canvas.removeEventListener("pointerdown", this.endClickHandler!);
      this.endClickHandler = null;
      this.scenes.data.replayUrl = undefined;
      this.scenes.data.replayData = undefined;
      this.scenes.switchTo("title");
    };
    app.canvas.addEventListener("pointerdown", this.endClickHandler);
  }

  private updateHud(): void {
    const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
    this.hud.update({
      distanceM: this.runState.distanceM,
      speed,
      kills: this.player.kills,
      hits: 0,
      hp: this.player.hp,
      hpMax: Math.max(1, this.player.hp),
      boost: this.player.boost,
      boostMax: Math.max(1, this.player.boost),
      round: this.runState.round,
      rocketsLeft: 0,
      scrap: this.runState.scrap,
      roundToll: 0,
      gold: this.runState.gold,
      xp: 0,
      xpMax: 1,
      level: this.runState.level,
      artifacts: 0,
      tierLabel: "",
      tierName: "",
      tierAccent: 0x4488aa,
      tierScrapMult: 1,
      tierCoinMult: 1,
      tierHpMult: 1,
      tierSpeedMult: 1,
    });
  }

  private drawWorld(viewW: number, viewH: number): void {
    this.gfxWorld.clear();
    this.gfxDebug.clear();

    this.drawStars(viewW, viewH);

    const terrain = this.world.terrain;
    const minX = this.player.pos.x - viewW;
    const maxX = this.player.pos.x + viewW + 600;

    this.gfxWorld.moveTo(minX, 2000);
    for (let x = minX; x <= maxX; x += 20) {
      this.gfxWorld.lineTo(x, terrain.groundYAt(x));
    }
    this.gfxWorld.lineTo(maxX, 2000);
    this.gfxWorld.closePath();
    this.gfxWorld.fill({ color: 0x1a2a1a, alpha: 1 });

    this.gfxWorld.moveTo(minX, terrain.groundYAt(minX));
    for (let x = minX; x <= maxX; x += 20) {
      this.gfxWorld.lineTo(x, terrain.groundYAt(x));
    }
    this.gfxWorld.stroke({ width: 2, color: 0x4488aa, alpha: 0.7 });

    const anchorX = TUNING.launcher.originX;
    const anchorY = TUNING.launcher.originY;
    this.gfxWorld.circle(anchorX, anchorY, 10).fill({ color: 0xffcc66, alpha: 0.9 });

    const rocketAngle = this.player.launched
      ? Math.atan2(this.player.vel.y, this.player.vel.x)
      : 0;
    if (this.rocketSprite) {
      this.rocketSprite.x = this.player.pos.x;
      this.rocketSprite.y = this.player.pos.y;
      this.rocketSprite.rotation = rocketAngle;
      this.rocketSprite.visible = true;
    } else {
      this.gfxWorld
        .circle(this.player.pos.x, this.player.pos.y, 12)
        .fill({ color: 0x66aaff, alpha: 0.95 });
    }

    const time = performance.now() * 0.001;
    const ufoTex = getUfoTexture();
    const aliveIds = new Set(this.drones.map((d) => d.id));
    for (const d of this.drones) {
      if (!ufoTex) continue;
      let sprite = this.droneSprites.get(d.id);
      if (!sprite) {
        sprite = new Sprite(ufoTex);
        sprite.anchor.set(0.5);
        this.droneContainer.addChild(sprite);
        this.droneSprites.set(d.id, sprite);
      }
      sprite.x = d.pos.x;
      sprite.y = d.pos.y;
      sprite.rotation = Math.sin(time * 2.5 + d.id) * 0.06;
      if (d.elite) {
        sprite.tint = 0xff77aa;
        sprite.scale.set(UFO_BASE_SCALE * 1.27);
      } else if (d.type === "shooter") {
        sprite.tint = 0x66ffee;
        sprite.scale.set(UFO_BASE_SCALE * 1.05);
      } else {
        sprite.tint = 0xffffff;
        sprite.scale.set(UFO_BASE_SCALE);
      }
    }
    for (const [id, sprite] of this.droneSprites) {
      if (!aliveIds.has(id)) {
        this.droneContainer.removeChild(sprite);
        sprite.destroy();
        this.droneSprites.delete(id);
      }
    }

    for (const c of this.coins) {
      if (!c.alive) continue;
      let sprite = this.coinSprites.get(c.id);
      if (!sprite && this.coinFrames.length > 0) {
        sprite = new AnimatedSprite(this.coinFrames);
        sprite.animationSpeed = 0.18;
        sprite.anchor.set(0.5);
        const size = TUNING.worldCoins.coinSize;
        sprite.width = size;
        sprite.height = size;
        this.coinContainer.addChild(sprite);
        this.coinSprites.set(c.id, sprite);
        sprite.play();
      }
      if (sprite) {
        sprite.x = c.pos.x;
        sprite.y = c.pos.y + Math.sin(this.coinAnimT * 2 + c.id) * 6;
      }
    }
    for (const [id, sprite] of this.coinSprites) {
      const coin = this.coins.find((x) => x.id === id);
      if (!coin || !coin.alive) {
        this.coinContainer.removeChild(sprite);
        sprite.destroy();
        this.coinSprites.delete(id);
      }
    }
  }

  private drawStars(viewW: number, viewH: number): void {
    const camX = -this.layers.world.x;
    const camY = -this.layers.world.y;
    for (const s of this.stars) {
      const sx = (((s.x - camX * s.p) % STAR_TILE_W) + STAR_TILE_W) % STAR_TILE_W;
      const sy = (((s.y - camY * s.p) % STAR_TILE_H) + STAR_TILE_H) % STAR_TILE_H;
      if (sx <= viewW && sy <= viewH) {
        this.gfxWorld
          .circle(sx + camX, sy + camY, s.r)
          .fill({ color: 0xffffff, alpha: s.a });
      }
    }
  }
}
