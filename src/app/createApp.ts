import { Application } from "pixi.js";
import { SceneManager } from "./scene/SceneManager";
import { TitleScene } from "./scene/TitleScene";
import { RunScene } from "./scene/RunScene";
import { MerchantScene } from "./scene/MerchantScene";
import { SummaryScene } from "./scene/SummaryScene";
import { ReplayScene } from "./scene/ReplayScene";
import { Debug } from "../core/debug/Debug";
import { initGoldModeOverlay } from "../ui/GoldModeOverlay";

export async function createApp(root: HTMLElement) {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: root,
    antialias: true
  });
  root.appendChild(app.canvas);

  initGoldModeOverlay();

  const debug = new Debug();
  const scenes = new SceneManager(app, root, debug);

  scenes.register("title", () => new TitleScene(scenes));
  scenes.register("run", () => new RunScene(scenes));
  scenes.register("merchant", () => new MerchantScene(scenes));
  scenes.register("summary", () => new SummaryScene(scenes));
  scenes.register("replay", () => new ReplayScene(scenes));
  scenes.start("title");

  // Simple global debug toggle
  window.addEventListener("keydown", (e) => {
    if (e.key === "`") debug.enabled = !debug.enabled;
  });
}
