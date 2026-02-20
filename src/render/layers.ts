import { Container } from "pixi.js";

export class Layers {
  world = new Container();
  fx = new Container();
  ui = new Container();

  root = new Container();

  constructor() {
    this.root.addChild(this.world, this.fx, this.ui);
  }
}
