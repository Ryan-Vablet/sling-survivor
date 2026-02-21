import { Container, Text } from "pixi.js";

export class Toast {
  root = new Container();
  private label: Text;
  private timer = 0;
  private duration = 0;

  constructor() {
    this.label = new Text({
      text: "",
      style: {
        fill: 0x44ffff,
        fontSize: 22,
        fontFamily: "system-ui, sans-serif",
        fontWeight: "bold",
        letterSpacing: 1,
        dropShadow: {
          alpha: 0.6,
          blur: 4,
          distance: 0,
          color: 0x000000,
        },
      },
    });
    this.label.anchor.set(0.5);
    this.root.addChild(this.label);
    this.root.visible = false;
  }

  show(message: string, duration = 2.5) {
    this.label.text = message;
    this.timer = 0;
    this.duration = duration;
    this.root.visible = true;
    this.root.alpha = 1;
  }

  update(dt: number) {
    if (!this.root.visible) return;
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.root.visible = false;
      return;
    }
    const fadeStart = this.duration - 0.6;
    if (this.timer > fadeStart) {
      this.root.alpha = 1 - (this.timer - fadeStart) / 0.6;
    }
  }

  layout(viewW: number, _viewH: number) {
    this.label.x = viewW / 2;
    this.label.y = 80;
  }
}
