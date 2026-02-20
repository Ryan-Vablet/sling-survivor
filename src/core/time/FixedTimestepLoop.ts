type FixedTimestepOpts = {
  fixedDt: number;
  maxSubSteps: number;
  onFixedUpdate: (dt: number) => void;
  onUpdate: (dt: number) => void;
};

export class FixedTimestepLoop {
  private fixedDt: number;
  private maxSubSteps: number;
  private onFixedUpdate: (dt: number) => void;
  private onUpdate: (dt: number) => void;

  private accumulator = 0;

  constructor(opts: FixedTimestepOpts) {
    this.fixedDt = opts.fixedDt;
    this.maxSubSteps = opts.maxSubSteps;
    this.onFixedUpdate = opts.onFixedUpdate;
    this.onUpdate = opts.onUpdate;
  }

  tick(frameDt: number) {
    // Clamp huge tab-switch deltas
    const dt = Math.min(frameDt, 0.25);
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this.onFixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    this.onUpdate(dt);
  }
}
