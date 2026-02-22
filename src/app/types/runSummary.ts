import type { ReplayData } from "../replay/replayTypes";

/**
 * Data for the run-end summary (game over screen). Used by SummaryScene and
 * stored with leaderboard entries so other players can view a run's build/stats.
 */
export type RunSummaryData = {
  initials: string;
  distanceM: number;
  scrap: number;
  gold: number;
  round: number;
  totalKills: number;
  level: number;
  upgrades: [string, number][]; // id, count
  evolutions: string[];
  artifacts: string[];
  /** Set when they just achieved a top-10 (local and/or global); shown with highlight on summary. */
  highScoreAchieved?: {
    initials: string;
    distance: number;
    local: boolean;
    global: boolean;
  };
  /** Replay data to upload on submit; after upload, replayUrl is set. */
  replayPayload?: ReplayData;
  /** URL of replay in Supabase Storage (set after upload or from leaderboard entry). */
  replayUrl?: string;
  /** Game version from VERSION file (for filtering leaderboards by version). */
  gameVersion?: string;
};
