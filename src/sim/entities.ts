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
  alive: boolean;
  elite: boolean;
  droneType: DroneType;
  shootTimer: number;
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
