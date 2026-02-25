import type { Vec2 } from "../core/math/vec2";

export type Player = {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  boost: number;
  dragDebuffT: number;
  launched: boolean;
  stallT: number;
  kills: number;
  hits: number;
};

export type DroneType = "chaser" | "shooter";

export type Drone = {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  speed: number;
  alive: boolean;
  elite: boolean;
  droneType: DroneType;
  shootTimer: number;
  /** Phase offset for wobble (0..2π), visual only. */
  wobblePhase: number;
};

export type Projectile = {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  alive: boolean;
  lifeT: number;
  piercing: boolean;
  pierceLeft: number;
  hitIds: number[];
};

export type EnemyBullet = {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  speedRetain: number;
  dragDebuff: number;
  alive: boolean;
  lifeT: number;
};

export type WorldCoin = {
  id: number;
  pos: Vec2;
  alive: boolean;
  bobPhase: number;
};

export type AsteroidSizeClass = "small" | "medium" | "large";

export type Asteroid = {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  /** 1–6, which asteroid_X.png to use. */
  spriteIndex: number;
  sizeClass: AsteroidSizeClass;
  rotation: number;
  spinSpeed: number;
  alive: boolean;
  /** Scrap reward (base, before tier mult). */
  scrapReward: number;
};
