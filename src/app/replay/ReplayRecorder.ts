import type { Player, Drone, WorldCoin } from "../../sim/entities";
import type { RunState } from "../../sim/runtime/RunState";
import type { ReplayData, ReplaySnapshot, ReplayEvent } from "./replayTypes";
import { TUNING } from "../../content/tuning";

const REPLAY_VERSION = 1;
const SNAPSHOT_EVERY_N_STEPS = 4; // ~15 Hz at 60 fixed steps/s

export class ReplayRecorder {
  private seed: number;
  private fixedDt: number;
  private snapshots: ReplaySnapshot[] = [];
  private events: ReplayEvent[] = [];
  private stepCount = 0;

  constructor(seed: number, fixedDt: number) {
    this.seed = seed;
    this.fixedDt = fixedDt;
  }

  /** Call every fixed step; records a snapshot every SNAPSHOT_EVERY_N_STEPS. */
  recordSnapshot(
    t: number,
    player: Player,
    drones: Drone[],
    worldCoins: WorldCoin[],
    runState: RunState
  ): void {
    this.stepCount++;
    if (this.stepCount % SNAPSHOT_EVERY_N_STEPS !== 0) return;

    const distanceM = Math.max(
      0,
      (player.pos.x - TUNING.launcher.originX) / 10
    );

    this.snapshots.push({
      t,
      player: {
        pos: { x: player.pos.x, y: player.pos.y },
        vel: { x: player.vel.x, y: player.vel.y },
        launched: player.launched,
        boost: player.boost,
        hp: player.hp,
        kills: player.kills,
      },
      drones: drones
        .filter((d) => d.alive)
        .map((d) => ({
          id: d.id,
          pos: { x: d.pos.x, y: d.pos.y },
          vel: { x: d.vel.x, y: d.vel.y },
          hp: d.hp,
          type: d.droneType,
          elite: d.elite,
        })),
      coins: worldCoins.map((c) => ({
        id: c.id,
        pos: { x: c.pos.x, y: c.pos.y },
        alive: c.alive,
      })),
      runState: {
        scrap: runState.scrap,
        gold: runState.gold,
        totalGoldEarned: runState.totalGoldEarned,
        totalScrap: runState.totalScrap,
        totalDistanceM: runState.totalDistanceM,
        round: runState.currentRound,
        level: runState.currentLevel,
        distanceM,
        roundToll: runState.roundToll,
        rocketsRemaining: runState.rocketsRemaining,
      },
    });
  }

  recordEvent(event: ReplayEvent): void {
    this.events.push(event);
  }

  getReplay(): ReplayData {
    const duration =
      this.snapshots.length > 0
        ? this.snapshots[this.snapshots.length - 1].t
        : 0;
    return {
      version: REPLAY_VERSION,
      seed: this.seed,
      fixedDt: this.fixedDt,
      duration,
      snapshots: this.snapshots,
      events: this.events,
    };
  }
}
