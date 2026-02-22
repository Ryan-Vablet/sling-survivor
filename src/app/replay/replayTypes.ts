/**
 * Replay data format: pure data, no assets. Stored as gzipped JSON in Supabase Storage.
 */

export type ReplayVec2 = { x: number; y: number };

export type ReplaySnapshotPlayer = {
  pos: ReplayVec2;
  vel: ReplayVec2;
  launched: boolean;
  boost: number;
  hp: number;
  kills: number;
};

export type ReplaySnapshotDrone = {
  id: number;
  pos: ReplayVec2;
  vel: ReplayVec2;
  hp: number;
  type: string;
  elite: boolean;
};

export type ReplaySnapshotCoin = {
  id: number;
  pos: ReplayVec2;
  alive: boolean;
};

export type ReplaySnapshotRunState = {
  scrap: number;
  gold: number;
  round: number;
  level: number;
  distanceM: number;
};

export type ReplaySnapshot = {
  t: number;
  player: ReplaySnapshotPlayer;
  drones: ReplaySnapshotDrone[];
  coins: ReplaySnapshotCoin[];
  runState: ReplaySnapshotRunState;
};

export type ReplayEvent =
  | { type: "launch"; t: number; vel: ReplayVec2 }
  | { type: "kill"; t: number; droneId?: number; pos?: ReplayVec2 }
  | { type: "coin_collect"; t: number; coinId: number }
  | { type: "upgrade_display"; t: number; choiceIds: [string, string, string] }
  | { type: "upgrade_pick"; t: number; index: number; pickedId: string }
  | { type: "round_complete"; t: number }
  | { type: "game_over"; t: number };

export type ReplayData = {
  version: number;
  seed: number;
  fixedDt: number;
  duration?: number;
  snapshots: ReplaySnapshot[];
  events: ReplayEvent[];
};
