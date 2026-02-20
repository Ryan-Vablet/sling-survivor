import { Container, Graphics, Text } from "pixi.js";

export class EndScreen {
  root = new Container();
  private panel = new Graphics();
  private text = new Text({ text: "", style: { fill: 0xffffff, fontSize: 18, fontFamily: "system-ui", align: "center" } });

  constructor() {
    this.root.addChild(this.panel, this.text);
  }

  layout(w: number, h: number) {
    this.panel.clear();
    this.panel.roundRect(0, 0, 420, 260, 18).fill({ color: 0x000000, alpha: 0.55 });
    this.panel.x = (w - 420) / 2;
    this.panel.y = (h - 260) / 2;

    this.text.anchor.set(0.5);
    this.text.x = w / 2;
    this.text.y = h / 2;
  }

  setText(t: string) {
    this.text.text = t;
  }
}
