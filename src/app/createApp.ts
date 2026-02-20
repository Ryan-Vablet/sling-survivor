import { Application } from "pixi.js";
import { SceneManager } from "./scene/SceneManager";
import { TitleScene } from "./scene/TitleScene";
import { RunScene } from "./scene/RunScene";
import { Debug } from "../core/debug/Debug";

export async function createApp(root: HTMLElement) {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: root,
    antialias: true
  });
  root.appendChild(app.canvas);

  const debug = new Debug();
  const scenes = new SceneManager(app, debug);

  scenes.register("title", () => new TitleScene(scenes));
  scenes.register("run", () => new RunScene(scenes));
  scenes.start("title");

  // Simple global debug toggle
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "d") debug.enabled = !debug.enabled;
  });
}
