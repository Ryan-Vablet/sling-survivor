import { Container, Graphics } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { Layers } from "../../render/layers";
import { Camera2D } from "../../render/Camera2D";
import { loadAssets } from "../../render/assets";
import { Keyboard } from "../../core/input/Keyboard";
import { PointerDrag } from "../../core/input/PointerDrag";
import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile, EnemyBullet } from "../../sim/entities";
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
import { RunState } from "../../sim/runtime/RunState";
import { rollUpgradeChoices } from "../../content/upgrades/upgradePool";
import { Hud } from "../../ui/Hud";
import { EndScreen } from "../../ui/EndScreen";
import { UpgradeOverlay } from "../../ui/UpgradeOverlay";
import { Toast } from "../../ui/Toast";

type Star = { x: number; y: number; a: number; r: number; p: number };

const STAR_TILE_W = 2000;
const STAR_TILE_H = 1200;
const STAR_COUNT = 140;

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

  private runState!: RunState;
  private upgradeOverlay = new UpgradeOverlay();
  private toast = new Toast();

  private player!: Player;
  private drones: Drone[] = [];
  private projectiles: Projectile[] = [];
  private enemyBullets: EnemyBullet[] = [];

  private gfxWorld = new Graphics();
  private gfxDebug = new Graphics();
  private hud = new Hud();
  private end = new EndScreen();
  private ended = false;

  private stars: Star[] = [];
  private resizeHandler: (() => void) | null = null;
  private endClickHandler: (() => void) | null = null;
  private debugKeyHandler: (() => void) | null = null;
  private freshReset = false;
  private shakeT = 0;
  private shakeIntensity = 0;
  private lastDistanceM = 0;

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  async enter(): Promise<void> {
    const app = this.scenes.getApp();
    this.scenes.getDebug().gfx.clear();

    app.stage.addChild(this.root);
    this.root.addChild(this.layers.root);

    this.layers.world.addChild(this.gfxWorld);
    this.layers.world.addChild(this.gfxDebug);
    this.layers.ui.addChild(this.hud.root);
    this.layers.ui.addChild(this.upgradeOverlay.root);
    this.layers.ui.addChild(this.toast.root);

    this.cam = new Camera2D(this.layers.world);

    this.kb = new Keyboard(window);
    this.drag = new PointerDrag(app.canvas);

    await loadAssets();
    this.initStars();
    this.resetRun();

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

  private resetRun() {
    this.ended = false;
    this.drones = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.spawner.reset();
    this.weapon.reset();
    this.droneAI.reset();
    this.upgradeOverlay.hide();
    this.shakeT = 0;
    this.lastDistanceM = 0;

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
    this.spawner.reset();
    this.weapon.reset();
    this.droneAI.reset();
    this.upgradeOverlay.hide();
    this.shakeT = 0;
    this.lastDistanceM = 0;

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

    this.spawner.step(
      this.player,
      this.drones,
      this.runState.rng,
      distanceM,
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
      this.runState.coins += killsDelta * TUNING.xp.coinPerKill;
      this.runState.currentXp += killsDelta * TUNING.xp.perKill;
      this.runState.totalKills += killsDelta;
    }

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
    this.drawWorld(app.renderer.width, app.renderer.height);

    const ps = this.runState.playerStats;
    const distanceM = Math.max(
      0,
      (this.player.pos.x - TUNING.launcher.originX) / 10
    );
    const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
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
      coins: this.runState.coins,
      roundToll: this.runState.roundCoinToll,
      xp: this.runState.currentXp,
      xpMax: this.runState.xpToNextLevel,
      level: this.runState.currentLevel,
    });

    
  }

  private endRocket() {
    this.ended = true;
    const distanceM = Math.max(
      0,
      (this.player.pos.x - TUNING.launcher.originX) / 10
    );

    if (this.runState.coins >= this.runState.roundCoinToll) {
      const tollPaid = this.runState.roundCoinToll;
      this.runState.coins -= this.runState.roundCoinToll;
      this.runState.currentRound++;
      this.runState.rocketsRemaining = TUNING.rounds.startingRockets;
      this.runState.roundCoinToll = Math.round(
        tollPaid * TUNING.rounds.tollScale
      );

      const pending = this.runState.pendingLevelUps;
      const pendingText =
        pending > 0
          ? `\n${pending} upgrade${pending > 1 ? "s" : ""} pending!`
          : "";

      this.end.setText(
        `ROUND ${this.runState.currentRound - 1} COMPLETE!\n\n` +
          `Toll paid: ${tollPaid} coins\n` +
          `Coins remaining: ${this.runState.coins}\n` +
          `Next toll: ${this.runState.roundCoinToll}\n` +
          `Rockets: ${this.runState.rocketsRemaining}` +
          `${pendingText}\n\n` +
          `Click to continue`
      );
      this.showEndScreenOverlay(() =>
        this.drainPendingUpgrades(() => this.resetRocket())
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
            `Coins: ${this.runState.coins} / ${this.runState.roundCoinToll}` +
            `${pendingText}\n\n` +
            `Click to relaunch`
        );
        this.showEndScreenOverlay(() =>
          this.drainPendingUpgrades(() => this.resetRocket())
        );
      } else {
        const upgrades = [...this.runState.appliedUpgrades.entries()]
          .map(([id, n]) => `  ${id} x${n}`)
          .join("\n");
        const evos = [...this.runState.appliedEvolutions]
          .map((id) => `  ${id}`)
          .join("\n");

        this.end.setText(
          `GAME OVER\n\n` +
            `Round: ${this.runState.currentRound}\n` +
            `Total Kills: ${this.runState.totalKills}\n` +
            `Level: ${this.runState.currentLevel}\n` +
            `Coins: ${this.runState.coins}` +
            `${upgrades ? `\n\nUpgrades:\n${upgrades}` : ""}` +
            `${evos ? `\n\nEvolutions:\n${evos}` : ""}\n\n` +
            `Click to restart`
        );
        this.showEndScreenOverlay(() => this.resetRun());
      }
    }
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

    this.gfxWorld.moveTo(minX, 2000);
    for (let x = minX; x <= maxX; x += 20) {
      this.gfxWorld.lineTo(x, terrain.groundYAt(x));
    }
    this.gfxWorld.lineTo(maxX, 2000);
    this.gfxWorld.closePath();
    this.gfxWorld.fill({ color: 0x1b2a3a, alpha: 1.0 });

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
    this.gfxWorld.stroke({ width: 2, color: 0x2d4a5e, alpha: 0.7 });

    const anchorX = TUNING.launcher.originX;
    const anchorY = TUNING.launcher.originY;
    this.gfxWorld
      .circle(anchorX, anchorY, 10)
      .fill({ color: 0xffcc66, alpha: 0.9 });

    this.gfxWorld
      .circle(this.player.pos.x, this.player.pos.y, this.player.radius)
      .fill({ color: 0x66aaff, alpha: 0.95 });

    this.drawThrustFlame();

    // Drones
    for (const d of this.drones) {
      if (!d.alive) continue;
      let color: number;
      if (d.droneType === "shooter") {
        color = 0xffaa33;
      } else if (d.elite) {
        color = 0xff3366;
      } else {
        color = 0xff66cc;
      }
      this.gfxWorld
        .circle(d.pos.x, d.pos.y, d.radius)
        .fill({ color, alpha: 0.9 });
      if (d.elite) {
        this.gfxWorld
          .circle(d.pos.x, d.pos.y, d.radius + 3)
          .stroke({ width: 2, color: 0xff0044, alpha: 0.6 });
      }
      if (d.droneType === "shooter") {
        this.gfxWorld
          .circle(d.pos.x, d.pos.y, d.radius + 2)
          .stroke({ width: 1.5, color: 0xff8800, alpha: 0.5 });
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

  private drawThrustFlame() {
    if (!this.player.launched) return;

    const axis = this.kb.getAxis();
    const thrusting = (axis.x !== 0 || axis.y !== 0) && this.player.boost > 0;
    if (!thrusting) return;

    const len = Math.hypot(axis.x, axis.y);
    const fx = -axis.x / len;
    const fy = -axis.y / len;
    const px = this.player.pos.x;
    const py = this.player.pos.y;
    const r = this.player.radius;

    const jx = (Math.random() - 0.5) * 4;
    const jy = (Math.random() - 0.5) * 4;

    this.gfxWorld
      .circle(px + fx * (r + 6) + jx, py + fy * (r + 6) + jy, 8)
      .fill({ color: 0xff6600, alpha: 0.8 });
    this.gfxWorld
      .circle(
        px + fx * (r + 15) + jx * 1.5,
        py + fy * (r + 15) + jy * 1.5,
        5
      )
      .fill({ color: 0xffaa00, alpha: 0.6 });
    this.gfxWorld
      .circle(
        px + fx * (r + 22) + jx * 2,
        py + fy * (r + 22) + jy * 2,
        3
      )
      .fill({ color: 0xffdd44, alpha: 0.4 });
  }
}
