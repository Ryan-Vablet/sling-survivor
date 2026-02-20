import { Container, Text } from "pixi.js";
import type { IScene } from "./IScene";
import type { SceneManager } from "./SceneManager";

export class TitleScene implements IScene {
  private scenes: SceneManager;
  private root = new Container();

  constructor(scenes: SceneManager) {
    this.scenes = scenes;
  }

  enter(): void {
    const app = this.scenes.getApp();
    app.stage.addChild(this.root);

    const title = new Text({
      text: "LAUNCHER SURVIVORS",
      style: { fill: 0xffffff, fontSize: 48, fontFamily: "system-ui" }
    });
    title.anchor.set(0.5);
    title.x = app.renderer.width / 2;
    title.y = app.renderer.height / 2 - 40;

    const sub = new Text({
      text: "Click to Play",
      style: { fill: 0xcccccc, fontSize: 18, fontFamily: "system-ui" }
    });
    sub.anchor.set(0.5);
    sub.x = app.renderer.width / 2;
    sub.y = app.renderer.height / 2 + 20;

    this.root.addChild(title, sub);

    const onClick = () => this.scenes.switchTo("run");
    app.canvas.addEventListener("pointerdown", onClick, { once: true });
  }

  exit(): void {
    // no-op; stage cleared by SceneManager
  }

  update(): void {}
}
