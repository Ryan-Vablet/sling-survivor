export type Vec2 = { x: number; y: number };

export const v2 = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s }),
  len: (a: Vec2): number => Math.hypot(a.x, a.y),
  norm: (a: Vec2): Vec2 => {
    const l = Math.hypot(a.x, a.y);
    if (l <= 1e-8) return { x: 0, y: 0 };
    return { x: a.x / l, y: a.y / l };
  }
};
