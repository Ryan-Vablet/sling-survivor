import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { Layers } from "../../render/layers";
import { Camera2D } from "../../render/Camera2D";
import { assetUrl, getRocketTexture, getUfoTexture, loadAssets } from "../../render/assets";
import { Keyboard } from "../../core/input/Keyboard";
import { PointerDrag } from "../../core/input/PointerDrag";
import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile, EnemyBullet, WorldCoin } from "../../sim/entities";
import { PhysicsWorld } from "../../sim/world/PhysicsWorld";
import { BoostThrustSystem } from "../../sim/systems/BoostThrustSystem";
import { LauncherSystem } from "../../sim/systems/LauncherSystem";
import { EnemySpawner } from "../../sim/systems/EnemySpawner";
import { DroneAI } from "../../sim/systems/DroneAI";
import { WeaponSystem } from "../../sim/systems/WeaponSystem";
import { CollisionSystem } from "../../sim/systems/CollisionSystem";
import { StallSystem } from "../../sim/systems/StallSystem";
import { UpgradeSystem } from "../../sim/systems/UpgradeSystem";
import { EvolutionSystem } from "../../sim/systems/EvolutionSystem";
import { TierSystem } from "../../sim/systems/TierSystem";
import { RunState } from "../../sim/runtime/RunState";
import { rollUpgradeChoices } from "../../content/upgrades/upgradePool";
import { Hud } from "../../ui/Hud";
import { EndScreen } from "../../ui/EndScreen";
import { UpgradeOverlay } from "../../ui/UpgradeOverlay";
import { Toast } from "../../ui/Toast";
import {
  isLocalTop10,
  isGlobalTop10,
  submitScore,
} from "../../api/leaderboard";
import { showInitialsPrompt } from "../../ui/LeaderboardOverlay";
import type { RunSummaryData } from "../types/runSummary";

const COIN_FRAMES = 8;

type Star = { x: number; y: number; a: number; r: number; p: number };

const STAR_TILE_W = 2000;
const STAR_TILE_H = 1200;
const STAR_COUNT = 140;

/** Rocket sprite scale (sprite is 64x32, nose east, engine west); ~1/3 smaller than 0.2. */
const ROCKET_SPRITE_SCALE = 0.133;

const SMOKE_TRAIL_MAX_AGE = 1.8;
const SMOKE_TRAIL_MAX_POINTS = 100;
const SMOKE_TRAIL_ADD_INTERVAL = 0.04;
const SMOKE_TRAIL_MIN_SPEED = 30;

type TrailPoint = { x: number; y: number; t: number };

export class RunScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();
  private layers = new Layers();
  private cam!: Camera2D;

  private kb!: Keyboard;
  private drag!: PointerDrag;

  private world = new PhysicsWorld();
  private thrust = new BoostThrustSystem();
  private launcher = new LauncherSystem();
  private spawner = new EnemySpawner();
  private droneAI = new DroneAI();
  private weapon = new WeaponSystem();
  private collide = new CollisionSystem();
  private stall = new StallSystem();
  private upgradeSys = new UpgradeSystem();
  private evolutionSys = new EvolutionSystem();
  private tierSys = new TierSystem();

  private runState!: RunState;
  private upgradeOverlay = new UpgradeOverlay();
  private toast = new Toast();

  private player!: Player;
  private drones: Drone[] = [];
  private projectiles: Projectile[] = [];
  private enemyBullets: EnemyBullet[] = [];

  private gfxWorld = new Graphics();
  private gfxThrustFlame = new Graphics();
  private gfxDebug = new Graphics();
  private rocketSprite: Sprite | null = null;
  private droneContainer = new Container();
  private droneSprites = new Map<number, Sprite>();
  private hud = new Hud();
  private end = new EndScreen();
  private ended = false;

  private worldCoins: WorldCoin[] = [];
  private coinSprites = new Map<number, AnimatedSprite>();
  private coinFrames: Texture[] = [];
  private coinContainer = new Container();
  private nextCoinId = 1;
  private nextCoinClusterX = 0;

  private stars: Star[] = [];
  private resizeHandler: (() => void) | null = null;
  private endClickHandler: (() => void) | null = null;
  private debugKeyHandler: (() => void) | null = null;
  private freshReset = false;
  private shakeT = 0;
  private shakeIntensity = 0;
  private lastDistanceM = 0;
  private maxDistanceM = 0;
  private coinAnimT = 0;
  private smokeTrail: TrailPoint[] = [];
  private lastTrailTime = 0;

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  async enter(): Promise<void> {
    // Initialize runState and player before any await so fixedUpdate never sees undefined
    // (SceneManager does not await enter(); ticker can run immediately after we add to stage)
    this.resetRun();

    const app = this.scenes.getApp();
    this.scenes.getDebug().gfx.clear();

    app.stage.addChild(this.root);
    this.root.addChild(this.layers.root);

    this.layers.world.addChild(this.gfxWorld);
    this.layers.world.addChild(this.coinContainer);
    this.layers.world.addChild(this.droneContainer);
    this.layers.world.addChild(this.gfxDebug);
    this.layers.ui.addChild(this.hud.root);
    this.layers.ui.addChild(this.upgradeOverlay.root);
    this.layers.ui.addChild(this.toast.root);

    this.cam = new Camera2D(this.layers.world);

    this.kb = new Keyboard(window);
    this.drag = new PointerDrag(app.canvas);

    await loadAssets();
    const rocketTex = getRocketTexture();
    if (rocketTex) {
      this.rocketSprite = new Sprite(rocketTex);
      this.rocketSprite.anchor.set(0.5);
      this.rocketSprite.scale.set(ROCKET_SPRITE_SCALE);
      this.layers.world.addChild(this.rocketSprite);
    }
    this.layers.world.addChild(this.gfxThrustFlame);
    await this.loadCoinFrames();
    this.initStars();

    const returningState = this.scenes.data.runState as RunState | undefined;
    if (returningState) {
      this.scenes.data.runState = undefined;
      this.runState = returningState;
      this.resetRocket();
    } else {
      this.resetRun();
    }

    this.resizeHandler = () => {
      const w = app.renderer.width;
      const h = app.renderer.height;
      this.hud.resize(w);
      this.end.layout(w, h);
      this.upgradeOverlay.layout(w, h);
      this.toast.layout(w, h);
    };
    window.addEventListener("resize", this.resizeHandler);
    this.resizeHandler();

    const onDbgKey = (e: KeyboardEvent) => {
      if (this.ended || this.runState.paused) return;
      if (import.meta.env.DEV && e.key === "g") {
        this.runState.rocketsRemaining = 1;
        this.endRocket();
        return;
      }
      if (!this.player.launched) return;

      if (e.key === "u") {
        this.runState.pendingLevelUps++;
        this.toast.show(
          `+1 pending (${this.runState.pendingLevelUps} queued)`
        );
      } else if (e.key === "e") {
        this.tryEvolve();
      } else if (e.key === "p") {
        this.spawner.spawnShooterNear(this.player, this.drones);
      }
    };
    window.addEventListener("keydown", onDbgKey);
    this.debugKeyHandler = () =>
      window.removeEventListener("keydown", onDbgKey);
  }

  exit(): void {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.endClickHandler) {
      this.scenes
        .getApp()
        .canvas.removeEventListener("pointerdown", this.endClickHandler);
      this.endClickHandler = null;
    }
    if (this.debugKeyHandler) {
      this.debugKeyHandler();
      this.debugKeyHandler = null;
    }
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * STAR_TILE_W,
        y: Math.random() * STAR_TILE_H,
        a: 0.15 + Math.random() * 0.85,
        r: 0.3 + Math.random() * 1.6,
        p: 0.01 + Math.random() * 0.07,
      });
    }
  }

  private async loadCoinFrames() {
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

  private clearWorldCoins() {
    for (const sprite of this.coinSprites.values()) {
      this.coinContainer.removeChild(sprite);
      sprite.destroy();
    }
    this.coinSprites.clear();
    this.worldCoins = [];
    this.nextCoinId = 1;
    this.nextCoinClusterX = TUNING.launcher.originX + 500;
  }

  private spawnCoinsAhead() {
    const viewAhead = this.player.pos.x + 1200;
    const wc = TUNING.worldCoins;
    const rng = this.runState.rng;

    while (this.nextCoinClusterX < viewAhead) {
      const baseX = this.nextCoinClusterX;
      const groundY = this.world.terrain.groundYAt(baseX);
      const baseY = groundY - 120 - rng.nextFloat() * 130;
      const count = wc.clusterMin + rng.nextInt(wc.clusterMax - wc.clusterMin + 1);

      for (let i = 0; i < count; i++) {
        const x = baseX + (i - count / 2) * 45;
        const y = baseY + Math.sin(i * 0.8) * 30;

        const coin: WorldCoin = {
          id: this.nextCoinId++,
          pos: { x, y },
          alive: true,
          bobPhase: rng.nextFloat() * Math.PI * 2,
        };
        this.worldCoins.push(coin);

        if (this.coinFrames.length > 0) {
          const sprite = new AnimatedSprite(this.coinFrames);
          sprite.width = wc.coinSize;
          sprite.height = wc.coinSize;
          sprite.anchor.set(0.5);
          sprite.animationSpeed = 0.15;
          sprite.gotoAndPlay(rng.nextInt(COIN_FRAMES));
          this.coinContainer.addChild(sprite);
          this.coinSprites.set(coin.id, sprite);
        }
      }

      this.nextCoinClusterX +=
        wc.spawnIntervalMin +
        rng.nextInt(wc.spawnIntervalMax - wc.spawnIntervalMin);
    }
  }

  private collectCoins() {
    const px = this.player.pos.x;
    const py = this.player.pos.y;
    const pr = this.player.radius + TUNING.worldCoins.pickupRadius;

    for (const c of this.worldCoins) {
      if (!c.alive) continue;
      const dx = c.pos.x - px;
      const dy = c.pos.y - py;
      if (dx * dx + dy * dy <= pr * pr) {
        c.alive = false;
        let goldGain: number =
          TUNING.worldCoins.goldPerPickup *
          this.tierSys.currentTier.reward.coinGoldMult;
        if (this.runState.appliedArtifacts.has("golden_thrusters")) {
          goldGain *= 1.2;
        }
        this.runState.gold += Math.round(goldGain);
        const sprite = this.coinSprites.get(c.id);
        if (sprite) {
          this.coinContainer.removeChild(sprite);
          sprite.destroy();
          this.coinSprites.delete(c.id);
        }
      }
    }

    // Remove coins far behind the player
    for (let i = this.worldCoins.length - 1; i >= 0; i--) {
      const c = this.worldCoins[i];
      if (!c.alive || c.pos.x < this.player.pos.x - 800) {
        const sprite = this.coinSprites.get(c.id);
        if (sprite) {
          this.coinContainer.removeChild(sprite);
          sprite.destroy();
          this.coinSprites.delete(c.id);
        }
        this.worldCoins.splice(i, 1);
      }
    }
  }

  private clearDroneSprites() {
    for (const sprite of this.droneSprites.values()) {
      this.droneContainer.removeChild(sprite);
      sprite.destroy();
    }
    this.droneSprites.clear();
  }

  private resetRun() {
    this.ended = false;
    this.drones = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.smokeTrail = [];
    this.lastTrailTime = 0;
    this.clearWorldCoins();
    this.clearDroneSprites();
    this.spawner.reset();
    this.weapon.reset();
    this.droneAI.reset();
    this.tierSys.reset();
    this.upgradeOverlay.hide();
    this.shakeT = 0;
    this.lastDistanceM = 0;
    this.maxDistanceM = 0;

    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("seed");
    const seed = seedParam ? parseInt(seedParam, 10) : undefined;
    this.runState = new RunState(seed);

    if (this.drag) {
      this.drag.state.isDragging = false;
      this.drag.state.released = false;
    }
    this.freshReset = true;

    const ps = this.runState.playerStats;
    this.player = {
      pos: { x: TUNING.launcher.originX, y: TUNING.launcher.originY },
      vel: { x: 0, y: 0 },
      radius: TUNING.player.radius,
      hp: ps.hpMax,
      boost: ps.boostMax,
      dragDebuffT: 0,
      launched: false,
      stallT: 0,
      kills: 0,
      hits: 0,
    };
  }

  private resetRocket() {
    this.ended = false;
    this.drones = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.smokeTrail = [];
    this.lastTrailTime = 0;
    this.clearWorldCoins();
    this.clearDroneSprites();
    this.spawner.reset();
    this.weapon.reset();
    this.droneAI.reset();
    this.tierSys.reset();
    this.upgradeOverlay.hide();
    this.shakeT = 0;
    this.lastDistanceM = 0;
    this.maxDistanceM = 0;

    if (this.drag) {
      this.drag.state.isDragging = false;
      this.drag.state.released = false;
    }
    this.freshReset = true;

    const ps = this.runState.playerStats;
    this.player = {
      pos: { x: TUNING.launcher.originX, y: TUNING.launcher.originY },
      vel: { x: 0, y: 0 },
      radius: TUNING.player.radius,
      hp: ps.hpMax,
      boost: ps.boostMax,
      dragDebuffT: 0,
      launched: false,
      stallT: 0,
      kills: 0,
      hits: 0,
    };
  }

  fixedUpdate(dt: number): void {
    if (this.ended) return;
    // INVARIANT: all timers (stall, dragDebuff, weapon cooldowns, spawner,
    // shooter cooldowns, enemy bullet lifetimes) advance below this gate.
    if (this.runState.paused) return;

    if (this.freshReset) {
      this.freshReset = false;
      this.drag.state.released = false;
      this.drag.state.isDragging = false;
    }

    const anchorScreenX = TUNING.launcher.originX + this.layers.world.x;
    const anchorScreenY = TUNING.launcher.originY + this.layers.world.y;
    this.launcher.applyLaunch(
      this.player,
      this.drag,
      anchorScreenX,
      anchorScreenY
    );

    if (!this.player.launched) return;

    const ps = this.runState.playerStats;

    this.thrust.step(this.player, this.kb, ps, dt);
    this.world.stepPlayer(this.player, dt);

    const distanceM = Math.max(
      0,
      (this.player.pos.x - TUNING.launcher.originX) / 10
    );

    const distDeltaM = Math.max(0, distanceM - this.lastDistanceM);
    if (distDeltaM > 0) {
      this.runState.currentXp += distDeltaM * (TUNING.xp.perKm / 1000);
    }
    this.lastDistanceM = distanceM;
    if (distanceM > this.maxDistanceM) this.maxDistanceM = distanceM;

    this.tierSys.update(distanceM);
    if (this.tierSys.tierJustChanged) {
      const t = this.tierSys.currentTier;
      this.toast.show(
        `ENTERING ${t.shortLabel} — ${t.name}\nScrap x${t.reward.scrapMult}  Gold x${t.reward.coinGoldMult}`,
        2.0
      );
    }

    const tier = this.tierSys.currentTier;

    this.spawner.step(
      this.player,
      this.drones,
      this.runState.rng,
      distanceM,
      tier,
      dt
    );
    this.droneAI.step(this.player, this.drones, this.enemyBullets, dt);

    this.weapon.step(
      this.player,
      this.drones,
      this.projectiles,
      this.runState,
      dt
    );

    const killsBefore = this.player.kills;
    this.collide.step(
      this.player,
      this.drones,
      this.projectiles,
      this.enemyBullets,
      ps,
      dt
    );
    const killsDelta = this.player.kills - killsBefore;
    if (killsDelta > 0) {
      let scrapGain = killsDelta * TUNING.scrap.perKill * tier.reward.scrapMult;
      if (this.runState.appliedArtifacts.has("scrap_magnet")) {
        scrapGain *= 1.25;
      }
      this.runState.scrap += Math.round(scrapGain);
      this.runState.currentXp += killsDelta * TUNING.xp.perKill;
      this.runState.totalKills += killsDelta;
    }

    this.spawnCoinsAhead();
    this.collectCoins();

    const levelBefore = this.runState.currentLevel;
    this.upgradeSys.checkLevelUp(this.runState);
    if (this.runState.currentLevel > levelBefore) {
      this.toast.show(`Level ${this.runState.currentLevel}!`);
    }

    if (this.stall.step(this.player, ps, dt)) {
      this.endRocket();
    }
  }

  private drainPendingUpgrades(onDone: () => void) {
    if (this.runState.pendingLevelUps <= 0) {
      onDone();
      return;
    }

    this.runState.pendingLevelUps--;
    const choices = rollUpgradeChoices(
      this.runState.rng,
      this.runState.appliedUpgrades,
      3,
      this.runState.weaponLoadout
    );

    if (choices.length === 0) {
      this.runState.pendingLevelUps = 0;
      onDone();
      return;
    }

    const app = this.scenes.getApp();
    this.upgradeOverlay.show(
      choices,
      app.renderer.width,
      app.renderer.height,
      (id) => {
        this.upgradeSys.applyChoice(this.runState, id);
        this.tryEvolve();
        this.drainPendingUpgrades(onDone);
      }
    );
  }

  private tryEvolve() {
    const result = this.evolutionSys.check(this.runState);
    if (result) {
      const evo = result.def;
      this.toast.show(`EVOLVED: ${evo.sourceWeaponId} → ${evo.name}`);
      this.shakeT = 0.3;
      this.shakeIntensity = 8;
    }
  }

  update(dt: number): void {
    const app = this.scenes.getApp();

    const camX = this.player.pos.x - app.renderer.width * 0.33;
    const camY = this.player.pos.y - app.renderer.height * 0.55;
    this.cam.follow(camX, camY);
    this.cam.update(dt);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const amt = this.shakeIntensity * Math.min(1, this.shakeT * 4);
      this.layers.world.x += (Math.random() - 0.5) * amt;
      this.layers.world.y += (Math.random() - 0.5) * amt;
    }

    this.toast.update(dt);
    this.coinAnimT += dt;
    for (const c of this.worldCoins) {
      if (!c.alive) continue;
      const sprite = this.coinSprites.get(c.id);
      if (sprite) {
        sprite.x = c.pos.x;
        sprite.y = c.pos.y + Math.sin(this.coinAnimT * 2 + c.bobPhase) * 6;
      }
    }
    this.drawWorld(app.renderer.width, app.renderer.height);

    const ps = this.runState.playerStats;
    const distanceM = Math.max(
      0,
      (this.player.pos.x - TUNING.launcher.originX) / 10
    );
    const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
    const currentTier = this.tierSys.currentTier;
    this.hud.update({
      distanceM,
      speed,
      kills: this.player.kills,
      hits: this.player.hits,
      hp: this.player.hp,
      hpMax: ps.hpMax,
      boost: this.player.boost,
      boostMax: ps.boostMax,
      round: this.runState.currentRound,
      rocketsLeft: this.runState.rocketsRemaining,
      scrap: this.runState.scrap,
      roundToll: this.runState.roundToll,
      gold: this.runState.gold,
      xp: this.runState.currentXp,
      xpMax: this.runState.xpToNextLevel,
      level: this.runState.currentLevel,
      artifacts: this.runState.appliedArtifacts.size,
      tierLabel: currentTier.shortLabel,
      tierName: currentTier.name,
      tierAccent: currentTier.visuals.accentColor,
      tierScrapMult: currentTier.reward.scrapMult,
      tierCoinMult: currentTier.reward.coinGoldMult,
      tierHpMult: currentTier.difficulty.enemyHpMult,
      tierSpeedMult: currentTier.difficulty.enemySpeedMult,
    });

    
  }

  private endRocket() {
    this.ended = true;
    const distanceM = Math.max(
      0,
      (this.player.pos.x - TUNING.launcher.originX) / 10
    );

    if (this.runState.scrap >= this.runState.roundToll) {
      const tollPaid = this.runState.roundToll;
      const excessScrap = this.runState.scrap - tollPaid;
      const goldFromScrap = Math.floor(
        excessScrap * TUNING.gold.scrapToGoldRate
      );
      const goldFromRockets =
        this.runState.rocketsRemaining * TUNING.gold.rocketBonus;
      const goldEarned = goldFromScrap + goldFromRockets;
      this.runState.gold += goldEarned;

      this.runState.scrap = 0;
      this.runState.currentRound++;
      let rockets = TUNING.rounds.startingRockets;
      if (this.runState.appliedArtifacts.has("extra_rocket")) rockets++;
      this.runState.rocketsRemaining = rockets;
      this.runState.roundToll = Math.round(
        tollPaid * TUNING.rounds.tollScale
      );

      const pending = this.runState.pendingLevelUps;
      const pendingText =
        pending > 0
          ? `\n${pending} upgrade${pending > 1 ? "s" : ""} pending!`
          : "";

      this.end.setText(
        `ROUND ${this.runState.currentRound - 1} COMPLETE!\n\n` +
          `Toll paid: ${tollPaid} scrap\n` +
          `Gold earned: +${goldEarned}\n` +
          `Gold total: ${this.runState.gold}\n` +
          `Next toll: ${this.runState.roundToll}\n` +
          `Rockets: ${this.runState.rocketsRemaining}` +
          `${pendingText}\n\n` +
          `Click to continue`
      );
      this.showEndScreenOverlay(() =>
        this.drainPendingUpgrades(() => {
          this.scenes.data.runState = this.runState;
          this.scenes.switchTo("merchant");
        })
      );
    } else {
      this.runState.rocketsRemaining--;

      if (this.runState.rocketsRemaining > 0) {
        const pending = this.runState.pendingLevelUps;
        const pendingText =
          pending > 0
            ? `\n${pending} upgrade${pending > 1 ? "s" : ""} pending!`
            : "";

        this.end.setText(
          `ROCKET LOST\n\n` +
            `Dist: ${distanceM.toFixed(0)}m  Kills: ${this.player.kills}\n` +
            `Rockets remaining: ${this.runState.rocketsRemaining}\n` +
            `Scrap: ${this.runState.scrap} / ${this.runState.roundToll}` +
            `${pendingText}\n\n` +
            `Click to relaunch`
        );
        this.showEndScreenOverlay(() =>
          this.drainPendingUpgrades(() => this.resetRocket())
        );
      } else {
        const summaryData: RunSummaryData = {
          initials: "???",
          distanceM: this.maxDistanceM,
          scrap: this.runState.scrap,
          gold: this.runState.gold,
          round: this.runState.currentRound,
          totalKills: this.runState.totalKills,
          level: this.runState.currentLevel,
          upgrades: [...this.runState.appliedUpgrades.entries()],
          evolutions: [...this.runState.appliedEvolutions],
          artifacts: [...this.runState.appliedArtifacts],
        };
        this.scenes.data.summaryData = summaryData;
        this.end.setText(
          `GAME OVER\n\nDistance: ${Math.round(this.maxDistanceM)} m\n\nClick to continue`
        );
        this.showEndScreenOverlay(() =>
          this.trySubmitScoreAndThen(summaryData, () => this.scenes.switchTo("summary"))
        );
      }
    }
  }

  private trySubmitScoreAndThen(summaryData: RunSummaryData, onDone: () => void) {
    const distance = Math.round(summaryData.distanceM);
    const localTop10 = isLocalTop10(distance);
    isGlobalTop10(distance).then((globalTop10) => {
      if (!localTop10 && !globalTop10) {
        onDone();
        return;
      }
      showInitialsPrompt(
        { distance: summaryData.distanceM, scrap: summaryData.scrap, gold: summaryData.gold },
        (initials) => {
          summaryData.initials = initials;
          const payload = {
            distance,
            scrap: summaryData.scrap,
            gold: summaryData.gold,
            summary: summaryData,
          };
          summaryData.highScoreAchieved = {
            initials,
            distance,
            local: localTop10,
            global: globalTop10,
          };
          submitScore(initials, payload, { toLocal: localTop10, toGlobal: globalTop10 }).then(
            () => onDone()
          );
        }
      );
    });
  }

  private showEndScreenOverlay(onContinue: () => void) {
    const app = this.scenes.getApp();

    if (!this.layers.ui.children.includes(this.end.root)) {
      this.layers.ui.addChild(this.end.root);
    }
    this.end.layout(app.renderer.width, app.renderer.height);

    if (this.endClickHandler) {
      app.canvas.removeEventListener("pointerdown", this.endClickHandler);
    }
    this.endClickHandler = () => {
      app.canvas.removeEventListener("pointerdown", this.endClickHandler!);
      this.endClickHandler = null;
      this.layers.ui.removeChild(this.end.root);
      onContinue();
    };
    app.canvas.addEventListener("pointerdown", this.endClickHandler);
  }

  // ── Rendering ────────────────────────────────────────────────

  private drawWorld(viewW: number, viewH: number) {
    const dbg = this.scenes.getDebug();
    this.gfxWorld.clear();
    this.gfxDebug.clear();

    this.drawStars(viewW, viewH);

    const terrain = this.world.terrain;
    const minX = this.player.pos.x - viewW;
    const maxX = this.player.pos.x + viewW + 600;

    const tierVis = this.tierSys.currentTier.visuals;

    this.gfxWorld.moveTo(minX, 2000);
    for (let x = minX; x <= maxX; x += 20) {
      this.gfxWorld.lineTo(x, terrain.groundYAt(x));
    }
    this.gfxWorld.lineTo(maxX, 2000);
    this.gfxWorld.closePath();
    this.gfxWorld.fill({ color: tierVis.groundColor, alpha: 1.0 });

    const tickStart = Math.floor(minX / 200) * 200;
    for (let tx = tickStart; tx <= maxX; tx += 200) {
      const gy = terrain.groundYAt(tx);
      const isMajor = tx % 1000 === 0;
      const tickH = isMajor ? 16 : 8;
      const alpha = isMajor ? 0.5 : 0.2;
      this.gfxWorld.moveTo(tx, gy);
      this.gfxWorld.lineTo(tx, gy + tickH);
      this.gfxWorld.stroke({
        width: isMajor ? 2 : 1,
        color: 0x4488aa,
        alpha,
      });

      if (isMajor) {
        const distLabel = Math.round((tx - TUNING.launcher.originX) / 10);
        if (distLabel > 0) {
          this.gfxWorld
            .circle(tx, gy + 22, 1)
            .fill({ color: 0x4488aa, alpha: 0.4 });
        }
      }
    }

    this.gfxWorld.moveTo(minX, terrain.groundYAt(minX));
    for (let x = minX; x <= maxX; x += 20) {
      this.gfxWorld.lineTo(x, terrain.groundYAt(x));
    }
    this.gfxWorld.stroke({ width: 2, color: tierVis.groundStroke, alpha: 0.7 });

    const anchorX = TUNING.launcher.originX;
    const anchorY = TUNING.launcher.originY;
    this.gfxWorld
      .circle(anchorX, anchorY, 10)
      .fill({ color: 0xffcc66, alpha: 0.9 });

    this.updateAndDrawSmokeTrail(viewW, viewH);

    // Player: rocket sprite or fallback circle if asset missing; rotation = sling aim before launch, velocity after
    const rocketAngle = this.player.launched
      ? Math.atan2(this.player.vel.y, this.player.vel.x)
      : this.getLaunchAimAngle();
    if (this.rocketSprite) {
      this.rocketSprite.x = this.player.pos.x;
      this.rocketSprite.y = this.player.pos.y;
      this.rocketSprite.rotation = rocketAngle;
      this.rocketSprite.visible = true;
    } else {
      this.gfxWorld
        .circle(this.player.pos.x, this.player.pos.y, this.player.radius)
        .fill({ color: 0x66aaff, alpha: 0.95 });
    }
    this.drawThrustFlame();

    // Drones: UFO sprites with wobble and variant tint/scale (small base; elites visibly bigger)
    const WOBBLE_AMPLITUDE = 0.06;
    const WOBBLE_SPEED = 2.5;
    const UFO_BASE_SCALE = 0.25;
    const time = performance.now() * 0.001;
    const ufoTex = getUfoTexture();
    const aliveDroneIds = new Set<number>();
    for (const d of this.drones) {
      if (!d.alive) continue;
      aliveDroneIds.add(d.id);
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
      sprite.rotation =
        Math.sin(time * WOBBLE_SPEED + d.wobblePhase) * WOBBLE_AMPLITUDE;
      if (d.elite) {
        sprite.tint = 0xff77aa;
        sprite.scale.set(UFO_BASE_SCALE * 1.27);
      } else if (d.droneType === "shooter") {
        sprite.tint = 0x66ffee;
        sprite.scale.set(UFO_BASE_SCALE * 1.05);
      } else {
        sprite.tint = 0xffffff;
        sprite.scale.set(UFO_BASE_SCALE);
      }
    }
    const toRemove: number[] = [];
    for (const [id, sprite] of this.droneSprites) {
      if (!aliveDroneIds.has(id)) toRemove.push(id);
    }
    for (const id of toRemove) {
      const sprite = this.droneSprites.get(id);
      if (sprite) {
        this.droneContainer.removeChild(sprite);
        sprite.destroy();
        this.droneSprites.delete(id);
      }
    }

    // Enemy bullets
    for (const eb of this.enemyBullets) {
      if (!eb.alive) continue;
      this.gfxWorld
        .circle(eb.pos.x, eb.pos.y, eb.radius)
        .fill({ color: 0xff4422, alpha: 0.85 });
    }

    // Player projectiles
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.piercing) {
        this.gfxWorld
          .circle(p.pos.x, p.pos.y, p.radius + 3)
          .fill({ color: 0x44ffff, alpha: 0.2 });
        this.gfxWorld
          .circle(p.pos.x, p.pos.y, p.radius)
          .fill({ color: 0x44ffff, alpha: 0.9 });
      } else {
        this.gfxWorld
          .circle(p.pos.x, p.pos.y, p.radius)
          .fill({ color: 0xffffff, alpha: 0.9 });
      }
    }

    // Aim line
    const st = this.drag.state;
    if (!this.player.launched && st.isDragging) {
      const camOffsetX = -this.layers.world.x;
      const camOffsetY = -this.layers.world.y;

      const pointerWorldX = st.x + camOffsetX;
      const pointerWorldY = st.y + camOffsetY;

      this.gfxDebug.moveTo(pointerWorldX, pointerWorldY);
      this.gfxDebug.lineTo(anchorX, anchorY);
      this.gfxDebug.stroke({ width: 3, color: 0xffffff, alpha: 0.6 });

      const pullX = anchorX - pointerWorldX;
      const pullY = anchorY - pointerWorldY;
      const dist = Math.hypot(pullX, pullY);
      if (dist > 6) {
        const dirX = pullX / dist;
        const dirY = pullY / dist;
        const indicatorLen =
          Math.min(dist, TUNING.launcher.maxPullDist) * 0.5;
        this.gfxDebug.moveTo(anchorX, anchorY);
        this.gfxDebug.lineTo(
          anchorX + dirX * indicatorLen,
          anchorY + dirY * indicatorLen
        );
        this.gfxDebug.stroke({ width: 2, color: 0xffcc66, alpha: 0.5 });
      }
    }

    if (dbg.enabled) {
      for (let x = minX; x <= maxX; x += 80) {
        this.gfxDebug
          .circle(x, terrain.groundYAt(x), 2)
          .fill({ color: 0xffffff, alpha: 0.35 });
      }
    }
  }

  private drawStars(viewW: number, viewH: number) {
    const camX = -this.layers.world.x;
    const camY = -this.layers.world.y;

    for (const s of this.stars) {
      const sx =
        (((s.x - camX * s.p) % STAR_TILE_W) + STAR_TILE_W) % STAR_TILE_W;
      const sy =
        (((s.y - camY * s.p) % STAR_TILE_H) + STAR_TILE_H) % STAR_TILE_H;
      if (sx <= viewW && sy <= viewH) {
        this.gfxWorld
          .circle(sx + camX, sy + camY, s.r)
          .fill({ color: 0xffffff, alpha: s.a });
      }
    }
  }

  /** Sling aim angle (east = 0); used for rocket rotation before launch. */
  private getLaunchAimAngle(): number {
    const st = this.drag.state;
    if (!st.isDragging) return 0;
    const camX = -this.layers.world.x;
    const camY = -this.layers.world.y;
    const wx = st.x + camX;
    const wy = st.y + camY;
    const ax = TUNING.launcher.originX;
    const ay = TUNING.launcher.originY;
    return Math.atan2(ay - wy, ax - wx);
  }

  /** Engine position = left edge (vertical middle) of rocket sprite; dir = backward for exhaust. Uses sprite width so scaling is correct. */
  private getEnginePosition(): { x: number; y: number; dirX: number; dirY: number } {
    const angle = this.player.launched
      ? Math.atan2(this.player.vel.y, this.player.vel.x)
      : this.getLaunchAimAngle();
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const halfLength = this.rocketSprite
      ? this.rocketSprite.width / 2
      : 32 * ROCKET_SPRITE_SCALE;
    return {
      x: this.player.pos.x - dirX * halfLength,
      y: this.player.pos.y - dirY * halfLength,
      dirX: -dirX,
      dirY: -dirY,
    };
  }

  private updateAndDrawSmokeTrail(viewW: number, viewH: number) {
    const now = performance.now() * 0.001;
    if (this.player.launched) {
      const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
      if (speed >= SMOKE_TRAIL_MIN_SPEED && now - this.lastTrailTime >= SMOKE_TRAIL_ADD_INTERVAL) {
        const eng = this.getEnginePosition();
        this.smokeTrail.push({ x: eng.x, y: eng.y, t: now });
        this.lastTrailTime = now;
      }
    } else {
      this.smokeTrail = [];
      this.lastTrailTime = 0;
    }
    while (this.smokeTrail.length > SMOKE_TRAIL_MAX_POINTS) this.smokeTrail.shift();
    while (this.smokeTrail.length > 0 && now - this.smokeTrail[0].t > SMOKE_TRAIL_MAX_AGE) this.smokeTrail.shift();

    for (const p of this.smokeTrail) {
      const age = now - p.t;
      const life = 1 - age / SMOKE_TRAIL_MAX_AGE;
      const alpha = life * life * 0.35;
      const r = 2 + (1 - life) * 5;
      this.gfxWorld.circle(p.x, p.y, r).fill({ color: 0xccccdd, alpha });
    }
    // Flame at contrail origin so it reads as fire emitting the smoke
    if (this.player.launched) {
      const eng = this.getEnginePosition();
      this.gfxWorld.circle(eng.x, eng.y, 5).fill({ color: 0xff6600, alpha: 0.75 });
      this.gfxWorld.circle(eng.x, eng.y, 3).fill({ color: 0xffaa00, alpha: 0.85 });
      this.gfxWorld.circle(eng.x, eng.y, 1.5).fill({ color: 0xffdd44, alpha: 0.9 });
    }
  }

  private drawThrustFlame() {
    this.gfxThrustFlame.clear();
    if (!this.player.launched) return;

    const axis = this.kb.getAxis();
    const thrusting = (axis.x !== 0 || axis.y !== 0) && this.player.boost > 0;
    if (!thrusting) return;

    const eng = this.getEnginePosition();
    const px = eng.x;
    const py = eng.y;
    const fx = eng.dirX;
    const fy = eng.dirY;

    const jx = (Math.random() - 0.5) * 4;
    const jy = (Math.random() - 0.5) * 4;
    const off1 = 8;
    const off2 = 16;
    const off3 = 22;

    this.gfxThrustFlame
      .circle(px + fx * off1 + jx, py + fy * off1 + jy, 5)
      .fill({ color: 0xff6600, alpha: 0.85 });
    this.gfxThrustFlame
      .circle(px + fx * off2 + jx * 1.5, py + fy * off2 + jy * 1.5, 3.5)
      .fill({ color: 0xffaa00, alpha: 0.65 });
    this.gfxThrustFlame
      .circle(px + fx * off3 + jx * 2, py + fy * off3 + jy * 2, 2)
      .fill({ color: 0xffdd44, alpha: 0.45 });
  }
}
