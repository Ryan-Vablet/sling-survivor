import type { Application } from "pixi.js";
import type { IScene } from "./IScene";
import type { Debug } from "../../core/debug/Debug";
import { FixedTimestepLoop } from "../../core/time/FixedTimestepLoop";

type SceneFactory = () => IScene;

export class SceneManager {
  private app: Application;
  private debug: Debug;
  private factories = new Map<string, SceneFactory>();
  private current: IScene | null = null;

  /** Bag for sharing state across scene transitions (e.g. RunState). */
  data: Record<string, unknown> = {};

  private loop: FixedTimestepLoop;

  constructor(app: Application, debug: Debug) {
    this.app = app;
    this.debug = debug;

    this.loop = new FixedTimestepLoop({
      fixedDt: 1 / 60,
      maxSubSteps: 5,
      onFixedUpdate: (dt) => this.current?.fixedUpdate?.(dt),
      onUpdate: (dt) => this.current?.update(dt)
    });

    // drive updates from Pixi ticker
    this.app.ticker.add(() => {
      const dt = this.app.ticker.deltaMS / 1000;
      this.loop.tick(dt);
    });
  }

  getApp() { return this.app; }
  getDebug() { return this.debug; }

  register(key: string, factory: SceneFactory) {
    this.factories.set(key, factory);
  }

  start(key: string) {
    this.switchTo(key);
  }

  switchTo(key: string) {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Unknown scene: ${key}`);

    if (this.current) {
      this.current.exit();
    }

    // Clear stage
    this.app.stage.removeChildren();

    this.current = factory();
    this.current.enter();
  }
}
