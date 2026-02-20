export class Keyboard {
  private keys = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    target.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    target.addEventListener("blur", () => this.keys.clear());
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  getAxis(): { x: number; y: number } {
    const left = this.isDown("a") || this.isDown("arrowleft");
    const right = this.isDown("d") || this.isDown("arrowright");
    const up = this.isDown("w") || this.isDown("arrowup");
    const down = this.isDown("s") || this.isDown("arrowdown");

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0)
    };
  }
}
