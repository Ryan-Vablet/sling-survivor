import { Container, Graphics, Text } from "pixi.js";

export class Hud {
  root = new Container();
  private textLeft: Text;
  private tierBadge: Text;
  private tierInfo: Text;
  private hpBar = new Graphics();
  private boostBar = new Graphics();
  private xpBar = new Graphics();
  private xpLabel: Text;

  constructor() {
    this.textLeft = new Text({
      text: "",
      style: {
        fill: 0xffffff,
        fontSize: 13,
        fontFamily: "system-ui",
        lineHeight: 17,
      },
    });
    this.textLeft.x = 12;
    this.textLeft.y = 10;

    this.tierBadge = new Text({
      text: "",
      style: {
        fill: 0x6688aa,
        fontSize: 14,
        fontFamily: "system-ui",
        fontWeight: "bold",
      },
    });
    this.tierBadge.x = 12;
    this.tierBadge.y = 70;

    this.tierInfo = new Text({
      text: "",
      style: {
        fill: 0x8899aa,
        fontSize: 10,
        fontFamily: "system-ui",
        lineHeight: 13,
      },
    });
    this.tierInfo.x = 12;
    this.tierInfo.y = 88;

    this.xpLabel = new Text({
      text: "",
      style: { fill: 0x44ff88, fontSize: 11, fontFamily: "system-ui" },
    });

    this.root.addChild(
      this.textLeft,
      this.tierBadge,
      this.tierInfo,
      this.hpBar,
      this.boostBar,
      this.xpBar,
      this.xpLabel
    );
  }

  resize(w: number) {
    this.hpBar.x = w - 220;
    this.hpBar.y = 12;
    this.boostBar.x = w - 220;
    this.boostBar.y = 34;
    this.xpBar.x = w - 220;
    this.xpBar.y = 56;
    this.xpLabel.x = w - 220 + 205;
    this.xpLabel.y = 54;
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
    round: number;
    rocketsLeft: number;
    scrap: number;
    roundToll: number;
    gold: number;
    xp: number;
    xpMax: number;
    level: number;
    artifacts: number;
    tierLabel: string;
    tierName: string;
    tierAccent: number;
    tierScrapMult: number;
    tierCoinMult: number;
    tierHpMult: number;
    tierSpeedMult: number;
  }) {
    const artText = data.artifacts > 0 ? `  Art: ${data.artifacts}` : "";
    this.textLeft.text =
      `Round ${data.round}  Rockets: ${data.rocketsLeft}  Gold: ${data.gold}${artText}\n` +
      `Scrap: ${data.scrap}/${data.roundToll}  Dist: ${data.distanceM.toFixed(0)}m  Speed: ${data.speed.toFixed(1)}\n` +
      `Kills: ${data.kills}  Hits: ${data.hits}`;

    this.tierBadge.text = `${data.tierLabel} — ${data.tierName}`;
    this.tierBadge.style.fill = data.tierAccent;

    this.tierInfo.text =
      `Scrap x${data.tierScrapMult.toFixed(2)}  Coin x${data.tierCoinMult.toFixed(2)}  ` +
      `HP x${data.tierHpMult.toFixed(2)}  Spd x${data.tierSpeedMult.toFixed(2)}`;

    const hpPct = Math.max(0, Math.min(1, data.hp / data.hpMax));
    const boostPct = Math.max(0, Math.min(1, data.boost / data.boostMax));
    const xpPct = Math.max(0, Math.min(1, data.xp / data.xpMax));

    this.hpBar.clear();
    this.hpBar
      .roundRect(0, 0, 200, 14, 7)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    this.hpBar
      .roundRect(0, 0, 200 * hpPct, 14, 7)
      .fill({ color: 0xff4d4d, alpha: 0.9 });

    this.boostBar.clear();
    this.boostBar
      .roundRect(0, 0, 200, 14, 7)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    this.boostBar
      .roundRect(0, 0, 200 * boostPct, 14, 7)
      .fill({ color: 0x4db8ff, alpha: 0.9 });

    this.xpBar.clear();
    this.xpBar
      .roundRect(0, 0, 200, 14, 7)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    this.xpBar
      .roundRect(0, 0, 200 * xpPct, 14, 7)
      .fill({ color: 0x44ff88, alpha: 0.9 });

    this.xpLabel.text = `Lv${data.level}`;
  }
}
