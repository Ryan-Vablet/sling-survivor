/**
 * Leaderboard API: Supabase when configured (.env), otherwise localStorage.
 * Entries have distance (primary), scrap, gold, and optional run summary for "View summary".
 *
 * Supabase table: include columns — initials (text), score (int8, legacy), distance (int8),
 * scrap (int8), gold (int8), summary_json (text nullable). Rank by distance.
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { RunSummaryData } from "../app/types/runSummary";

const STORAGE_KEY = "sling-survivor-leaderboard";
const TOP_N = 10;
const TABLE = "leaderboard";

export type LeaderboardEntry = {
  initials: string;
  /** Primary stat for ranking (meters traveled). */
  distance: number;
  scrap: number;
  /** Gold at end of run (after merchant spending). */
  gold: number;
  /** Total gold earned during run (never reduced by spending). Optional for old entries. */
  totalGoldEarned?: number;
  /** JSON string of RunSummaryData for "View summary"; optional for old entries. */
  summaryJson?: string;
  /** URL of replay in Supabase Storage (optional). */
  replayUrl?: string;
  /** Game version from VERSION file (optional). */
  gameVersion?: string;
  /** True if flagged as cheater; excluded from normal global leaderboard, shown in h4x0rs. */
  cheater?: boolean;
};

/** Backward compat: treat legacy "score" as distance when present. */
function normRow(row: Record<string, unknown>): LeaderboardEntry {
  const distance = Number(row.distance ?? row.score ?? 0);
  const gold = Number(row.gold ?? 0);
  const totalGoldEarned = row.total_gold_earned != null ? Number(row.total_gold_earned) : undefined;
  return {
    initials: String(row.initials ?? "").slice(0, 3) || "???",
    distance,
    scrap: Number(row.scrap ?? 0),
    gold,
    totalGoldEarned,
    summaryJson: row.summary_json != null ? String(row.summary_json) : undefined,
    replayUrl: row.replay_url != null ? String(row.replay_url) : undefined,
    gameVersion: row.game_version != null ? String(row.game_version) : undefined,
    cheater: row.cheater === true,
  };
}

function getLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed.map(normRow) : [];
  } catch {
    return [];
  }
}

function setLocalEntries(entries: LeaderboardEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function sortByDistance(entries: LeaderboardEntry[]) {
  return entries.slice().sort((a, b) => b.distance - a.distance);
}

/** Local leaderboard only (this device). */
export function getLocalLeaderboard(): LeaderboardEntry[] {
  const local = getLocalEntries();
  return sortByDistance(local).slice(0, TOP_N);
}

/** Global leaderboard (Supabase). Excludes cheaters. Optional majorVersion: "all" or undefined = no filter; "0.6" = game_version like "0.6%". Returns [] if not configured or on error. */
export async function getGlobalLeaderboard(majorVersion?: string): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    let q = supabase
      .from(TABLE)
      .select("initials, distance, scrap, gold, total_gold_earned, summary_json, replay_url, game_version, cheater")
      .eq("cheater", false)
      .order("distance", { ascending: false })
      .limit(TOP_N);
    if (majorVersion && majorVersion !== "all") {
      q = q.like("game_version", `${majorVersion}%`);
    }
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []).map((row: Record<string, unknown>) => normRow(row));
  } catch {
    return [];
  }
}

/** Global leaderboard entries flagged as cheaters (for "h4x0rs" section). Returns [] if not configured or on error. */
export async function getGlobalLeaderboardCheaters(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("initials, distance, scrap, gold, total_gold_earned, summary_json, replay_url, game_version, cheater")
      .eq("cheater", true)
      .order("distance", { ascending: false })
      .limit(50);
    if (error) return [];
    return (data ?? []).map((row: Record<string, unknown>) => normRow(row));
  } catch {
    return [];
  }
}

/** Unique major versions (e.g. "0.6", "0.7") from global leaderboard (non-cheaters only) for filter dropdown. First value is "all". */
export async function getGlobalLeaderboardVersionOptions(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return ["all"];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("game_version")
      .eq("cheater", false)
      .not("game_version", "is", null);
    if (error) return ["all"];
    const versions = (data ?? []) as { game_version: string }[];
    const majorSet = new Set<string>();
    for (const r of versions) {
      const v = String(r.game_version ?? "").trim();
      if (!v) continue;
      const major = v.match(/^\d+\.\d+/)?.[0] ?? v;
      majorSet.add(major);
    }
    const sorted = [...majorSet].sort((a, b) => {
      const [a1, a2] = a.split(".").map(Number);
      const [b1, b2] = b.split(".").map(Number);
      return a1 !== b1 ? a1 - b1 : (a2 ?? 0) - (b2 ?? 0);
    });
    return ["all", ...sorted];
  } catch {
    return ["all"];
  }
}

/** Fetch leaderboard: Supabase first (when configured), then localStorage. */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const list = await getGlobalLeaderboard();
  if (list.length > 0) return list;
  return getLocalLeaderboard();
}

/** True if this distance would be in the local top 10. */
export function isLocalTop10(distance: number): boolean {
  const list = getLocalLeaderboard();
  if (list.length < TOP_N) return true;
  return distance > (list[list.length - 1]?.distance ?? -1);
}

/** True if this distance would be in the global top 10. */
export async function isGlobalTop10(distance: number): Promise<boolean> {
  const list = await getGlobalLeaderboard();
  if (list.length < TOP_N) return true;
  return distance > (list[list.length - 1]?.distance ?? -1);
}

function makeEntry(
  initials: string,
  payload: {
    distance: number;
    scrap: number;
    gold: number;
    totalGoldEarned?: number;
    summary?: RunSummaryData;
    replayUrl?: string;
    gameVersion?: string;
  }
): LeaderboardEntry {
  const summaryJson = payload.summary ? JSON.stringify(payload.summary) : undefined;
  return {
    initials: String(initials).toUpperCase().slice(0, 3) || "???",
    distance: Math.max(0, payload.distance),
    scrap: Math.max(0, payload.scrap),
    gold: Math.max(0, payload.gold),
    totalGoldEarned: payload.totalGoldEarned != null ? Math.max(0, payload.totalGoldEarned) : undefined,
    summaryJson,
    replayUrl: payload.replayUrl,
    gameVersion: payload.gameVersion,
  };
}

/** Add entry to local leaderboard (this device). */
export function submitToLocal(entry: LeaderboardEntry): void {
  const entries = getLocalEntries();
  entries.push(entry);
  setLocalEntries(sortByDistance(entries).slice(0, TOP_N));
  console.log("[Leaderboard] Score saved to local");
}

/** Submit entry to global leaderboard via Edge Function (Matt-proof). No-op if not configured. */
export async function submitToGlobal(
  initials: string,
  payload: {
    distance: number;
    scrap: number;
    gold: number;
    totalGoldEarned?: number;
    summary?: RunSummaryData;
    replayUrl?: string;
    gameVersion?: string;
  }
): Promise<void> {
  const entry = makeEntry(initials, payload);
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.functions.invoke("submit-score", {
      body: {
        initials: entry.initials,
        distance: entry.distance,
        scrap: entry.scrap,
        gold: entry.gold,
        total_gold_earned: entry.totalGoldEarned ?? null,
        summary_json: entry.summaryJson ?? null,
        replay_url: entry.replayUrl ?? null,
        game_version: entry.gameVersion ?? null,
      },
    });
    if (error) {
      console.warn("[Leaderboard] submit-score failed:", error.message);
      return;
    }
    console.log("[Leaderboard] Score saved to global (Supabase)");
  } catch (e) {
    console.warn("[Leaderboard] Supabase error on submit:", e);
  }
}

/** Submit an entry (initials + distance/scrap/gold + optional totalGoldEarned + optional summary + optional replayUrl + optional gameVersion). Writes to both local and global when applicable. */
export async function submitScore(
  initials: string,
  payload: {
    distance: number;
    scrap: number;
    gold: number;
    totalGoldEarned?: number;
    summary?: RunSummaryData;
    replayUrl?: string;
    gameVersion?: string;
  },
  options: { toLocal: boolean; toGlobal: boolean }
): Promise<void> {
  const entry = makeEntry(initials, payload);
  if (options.toLocal) submitToLocal(entry);
  if (options.toGlobal) await submitToGlobal(initials, payload);
}

/** Parse summary from a leaderboard entry for SummaryScene. */
export function getSummaryFromEntry(entry: LeaderboardEntry): RunSummaryData | null {
  if (!entry.summaryJson) return null;
  try {
    return JSON.parse(entry.summaryJson) as RunSummaryData;
  } catch {
    return null;
  }
}
