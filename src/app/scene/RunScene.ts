import { Container, Graphics, Text } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";
import { Layers } from "../../render/layers";
import { Camera2D } from "../../render/Camera2D";
import { loadAssets } from "../../render/assets";
import { Keyboard } from "../../core/input/Keyboard";
import { PointerDrag } from "../../core/input/PointerDrag";
import { TUNING } from "../../content/tuning";
import type { Drone, Player, Projectile } from "../../sim/entities";
import { PhysicsWorld } from "../../sim/world/PhysicsWorld";
import { BoostThrustSystem } from "../../sim/systems/BoostThrustSystem";
import { LauncherSystem } from "../../sim/systems/LauncherSystem";
import { EnemySpawner } from "../../sim/systems/EnemySpawner";
import { DroneAI } from "../../sim/systems/DroneAI";
import { WeaponSystem } from "../../sim/systems/WeaponSystem";
import { CollisionSystem } from "../../sim/systems/CollisionSystem";
import { StallSystem } from "../../sim/systems/StallSystem";
import { Hud } from "../../ui/Hud";
import { EndScreen } from "../../ui/EndScreen";

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

  private player!: Player;
  private drones: Drone[] = [];
  private projectiles: Projectile[] = [];

  // Render primitives (scaffold renders with Graphics)
  private gfxWorld = new Graphics();
  private gfxDebug = new Graphics();
  private hud = new Hud();
  private end = new EndScreen();
  private ended = false;

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

    this.cam = new Camera2D(this.layers.world);

    this.kb = new Keyboard(window);
    this.drag = new PointerDrag(app.canvas);

    await loadAssets();

    this.resetRun();

    // resize handling
    const onResize = () => {
      this.hud.resize(app.renderer.width);
      this.end.layout(app.renderer.width, app.renderer.height);
    };
    window.addEventListener("resize", onResize);
    onResize();
  }

  exit(): void {
    // no-op (SceneManager clears stage)
  }

  private resetRun() {
    this.ended = false;
    this.drones = [];
    this.projectiles = [];

    // Place player at launcher
    this.player = {
      pos: { x: 120, y: 320 },
      vel: { x: 0, y: 0 },
      radius: TUNING.player.radius,
      hp: TUNING.player.hpMax,
      boost: TUNING.player.boostMax,
      dragDebuffT: 0,
      launched: false,
      stallT: 0,
      kills: 0,
      hits: 0
    };
  }

  fixedUpdate(dt: number): void {
    if (this.ended) return;

    // Launch: once drag released with meaningful vector
    this.launcher.applyLaunch(this.player, this.drag, (sx, sy) => ({ x: sx, y: sy }));

    // Boost thrust
    this.thrust.step(this.player, this.kb, dt);

    // Physics step
    this.world.stepPlayer(this.player, dt);

    // Enemies
    this.spawner.step(this.player, this.drones, dt);
    this.droneAI.step(this.player, this.drones, dt);

    // Weapon + projectiles
    this.weapon.step(this.player, this.drones, this.projectiles, dt);

    // Collisions
    this.collide.step(this.player, this.drones, this.projectiles, dt);

    // End condition
    if (this.stall.step(this.player, dt)) {
      this.endRun();
    }
  }

  update(dt: number): void {
    const app = this.scenes.getApp();

    // camera follow: keep player around left third / mid height
    const camX = this.player.pos.x - app.renderer.width * 0.33;
    const camY = this.player.pos.y - app.renderer.height * 0.55;
    this.cam.follow(camX, camY);
    this.cam.update(dt);

    // draw world
    this.drawWorld(app.renderer.width, app.renderer.height);

    // update HUD
    const distanceM = Math.max(0, (this.player.pos.x - 120) / 10); // 10px per meter placeholder
    const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
    this.hud.update({
      distanceM,
      speed,
      kills: this.player.kills,
      hits: this.player.hits,
      hp: this.player.hp,
      hpMax: TUNING.player.hpMax,
      boost: this.player.boost,
      boostMax: TUNING.player.boostMax
    });

    // if ended, show end screen overlay
    if (this.ended) {
      if (!this.layers.ui.children.includes(this.end.root)) {
        this.layers.ui.addChild(this.end.root);
        this.end.layout(app.renderer.width, app.renderer.height);
      }
    }
  }

  private endRun() {
    this.ended = true;
    const distanceM = Math.max(0, (this.player.pos.x - 120) / 10);
    const speed = Math.hypot(this.player.vel.x, this.player.vel.y);
    const score = distanceM * (1 + this.player.kills * 0.01);

    this.end.setText(
      `RUN OVER\n\nDistance: ${distanceM.toFixed(0)}m\nKills: ${this.player.kills}\nHits: ${this.player.hits}\nSpeed: ${speed.toFixed(1)}\n\nScore: ${score.toFixed(0)}\n\nClick to Restart`
    );

    const app = this.scenes.getApp();
    const onClick = () => {
      app.canvas.removeEventListener("pointerdown", onClick);
      this.layers.ui.removeChild(this.end.root);
      this.resetRun();
    };
    app.canvas.addEventListener("pointerdown", onClick);
  }

  private drawWorld(viewW: number, viewH: number) {
    const dbg = this.scenes.getDebug();
    this.gfxWorld.clear();
    this.gfxDebug.clear();

    // stars background (cheap)
    // note: world container moves; stars drawn in world space for now
    // ground
    const terrain = this.world.terrain;
    const minX = this.player.pos.x - 200;
    const maxX = this.player.pos.x + viewW + 600;

    // Draw ground polyline + fill
    this.gfxWorld.moveTo(minX, 2000);
    for (let x = minX; x <= maxX; x += 20) {
      const y = terrain.groundYAt(x);
      this.gfxWorld.lineTo(x, y);
    }
    this.gfxWorld.lineTo(maxX, 2000);
    this.gfxWorld.closePath();
    this.gfxWorld.fill({ color: 0x1b2a3a, alpha: 1.0 });

    // launcher base marker
    this.gfxWorld.circle(120, 320, 10).fill({ color: 0xffcc66, alpha: 0.9 });

    // player
    this.gfxWorld.circle(this.player.pos.x, this.player.pos.y, this.player.radius).fill({ color: 0x66aaff, alpha: 0.95 });

    // drones
    for (const d of this.drones) {
      if (!d.alive) continue;
      this.gfxWorld.circle(d.pos.x, d.pos.y, d.radius).fill({ color: 0xff66cc, alpha: 0.9 });
    }

    // projectiles
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      this.gfxWorld.circle(p.pos.x, p.pos.y, p.radius).fill({ color: 0xffffff, alpha: 0.9 });
    }

    // aim line (screen-space drag to world-space hint; drawn in world for simplicity)
    const st = this.drag.state;
    if (!this.player.launched && st.isDragging) {
      const dx = st.startX - st.x;
      const dy = st.startY - st.y;
      // Draw in screen space approx: convert to world by adding camera offset
      const camOffsetX = -this.layers.world.x;
      const camOffsetY = -this.layers.world.y;

      const sx0 = st.startX + camOffsetX;
      const sy0 = st.startY + camOffsetY;
      const sx1 = st.x + camOffsetX;
      const sy1 = st.y + camOffsetY;

      this.gfxDebug.moveTo(sx0, sy0);
      this.gfxDebug.lineTo(sx1, sy1);
      this.gfxDebug.stroke({ width: 3, color: 0xffffff, alpha: 0.6 });
    }

    if (dbg.enabled) {
      // Debug ground profile
      for (let x = minX; x <= maxX; x += 80) {
        const y = terrain.groundYAt(x);
        this.gfxDebug.circle(x, y, 2).fill({ color: 0xffffff, alpha: 0.35 });
      }
    }
  }
}
