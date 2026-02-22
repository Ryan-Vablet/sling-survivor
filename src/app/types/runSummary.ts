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
};
