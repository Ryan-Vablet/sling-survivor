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
  gold: number;
  /** JSON string of RunSummaryData for "View summary"; optional for old entries. */
  summaryJson?: string;
};

/** Backward compat: treat legacy "score" as distance when present. */
function normRow(row: Record<string, unknown>): LeaderboardEntry {
  const distance = Number(row.distance ?? row.score ?? 0);
  return {
    initials: String(row.initials ?? "").slice(0, 3) || "???",
    distance,
    scrap: Number(row.scrap ?? 0),
    gold: Number(row.gold ?? 0),
    summaryJson: row.summary_json != null ? String(row.summary_json) : undefined,
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

/** Fetch leaderboard: Supabase first (when configured), then localStorage. */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log("[Leaderboard] Fetching from Supabase…");
      const { data, error } = await supabase
        .from(TABLE)
        .select("initials, distance, scrap, gold, summary_json")
        .order("distance", { ascending: false })
        .limit(TOP_N);

      if (error) {
        console.warn("[Leaderboard] Supabase fetch failed:", error.message, "→ using localStorage");
        const local = getLocalEntries();
        const result = sortByDistance(local).slice(0, TOP_N);
        console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
        return result;
      }

      const entries = (data ?? []).map((row: Record<string, unknown>) => normRow(row));
      console.log("[Leaderboard] Loaded", entries.length, "entries from Supabase (persisted in DB)");
      return entries;
    } catch (e) {
      console.warn("[Leaderboard] Supabase error:", e, "→ using localStorage");
      const local = getLocalEntries();
      const result = sortByDistance(local).slice(0, TOP_N);
      console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
      return result;
    }
  }

  if (!isSupabaseConfigured()) {
    console.log("[Leaderboard] Supabase not configured (.env missing) → using localStorage");
  }
  const local = getLocalEntries();
  const result = sortByDistance(local).slice(0, TOP_N);
  console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
  return result;
}

/** Submit an entry (initials + distance/scrap/gold + optional summary). */
export async function submitScore(
  initials: string,
  payload: { distance: number; scrap: number; gold: number; summary?: RunSummaryData }
): Promise<void> {
  const summaryJson = payload.summary ? JSON.stringify(payload.summary) : undefined;
  const entry: LeaderboardEntry = {
    initials: String(initials).toUpperCase().slice(0, 3) || "???",
    distance: Math.max(0, payload.distance),
    scrap: Math.max(0, payload.scrap),
    gold: Math.max(0, payload.gold),
    summaryJson,
  };

  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log("[Leaderboard] Submitting to Supabase…", { initials: entry.initials, distance: entry.distance });
      const { error } = await supabase.from(TABLE).insert({
        initials: entry.initials,
        score: entry.distance,
        distance: entry.distance,
        scrap: entry.scrap,
        gold: entry.gold,
        summary_json: summaryJson ?? null,
      });

      if (error) {
        console.warn("[Leaderboard] Supabase submit failed:", error.message, "→ saving to localStorage");
        const entries = getLocalEntries();
        entries.push(entry);
        setLocalEntries(sortByDistance(entries).slice(0, TOP_N));
        console.log("[Leaderboard] Score saved to localStorage");
        return;
      }

      console.log("[Leaderboard] Score saved to Supabase (persisted in DB)");
      return;
    } catch (e) {
      console.warn("[Leaderboard] Supabase error on submit:", e, "→ saving to localStorage");
      const entries = getLocalEntries();
      entries.push(entry);
      setLocalEntries(sortByDistance(entries).slice(0, TOP_N));
      console.log("[Leaderboard] Score saved to localStorage");
      return;
    }
  }

  if (!isSupabaseConfigured()) {
    console.log("[Leaderboard] Supabase not configured (.env missing) → saving to localStorage");
  }
  const entries = getLocalEntries();
  entries.push(entry);
  setLocalEntries(sortByDistance(entries).slice(0, TOP_N));
  console.log("[Leaderboard] Score saved to localStorage");
}

/** True if this distance would be in the top 10. */
export async function isTop10(distance: number): Promise<boolean> {
  const list = await getLeaderboard();
  if (list.length < TOP_N) return true;
  return distance > (list[list.length - 1]?.distance ?? -1);
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
