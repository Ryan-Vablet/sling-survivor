import { Container, Graphics, Text } from "pixi.js";

export class Hud {
  root = new Container();
  private textLeft: Text;
  private hpBar = new Graphics();
  private boostBar = new Graphics();

  constructor() {
    this.textLeft = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: 14, fontFamily: "system-ui" }
    });
    this.textLeft.x = 12;
    this.textLeft.y = 10;

    this.root.addChild(this.textLeft, this.hpBar, this.boostBar);
  }

  resize(w: number) {
    // Bars in top-right
    this.hpBar.x = w - 220;
    this.hpBar.y = 12;
    this.boostBar.x = w - 220;
    this.boostBar.y = 34;
  }

  update(data: {
    distanceM: number;
    speed: number;
    kills: number;
    hits: number;
    hp: number;
    hpMax: number;
    boost: number;
    boostMax: number;
  }) {
    this.textLeft.text =
      `Distance: ${data.distanceM.toFixed(0)}m\n` +
      `Speed: ${data.speed.toFixed(1)}\n` +
      `Kills: ${data.kills}  Hits: ${data.hits}`;

    const hpPct = Math.max(0, Math.min(1, data.hp / data.hpMax));
    const boostPct = Math.max(0, Math.min(1, data.boost / data.boostMax));

    this.hpBar.clear();
    this.hpBar.roundRect(0, 0, 200, 14, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    this.hpBar.roundRect(0, 0, 200 * hpPct, 14, 7).fill({ color: 0xff4d4d, alpha: 0.9 });

    this.boostBar.clear();
    this.boostBar.roundRect(0, 0, 200, 14, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    this.boostBar.roundRect(0, 0, 200 * boostPct, 14, 7).fill({ color: 0x4db8ff, alpha: 0.9 });
  }
}
