/**
 * Leaderboard API: Supabase when configured (.env), otherwise localStorage.
 * Console logs indicate whether data is persisting in DB or localStorage.
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "sling-survivor-leaderboard";
const TOP_N = 10;
const TABLE = "leaderboard";

export type LeaderboardEntry = { initials: string; score: number };

function getLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalEntries(entries: LeaderboardEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Fetch leaderboard: Supabase first (when configured), then localStorage. */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log("[Leaderboard] Fetching from Supabase…");
      const { data, error } = await supabase
        .from(TABLE)
        .select("initials, score")
        .order("score", { ascending: false })
        .limit(TOP_N);

      if (error) {
        console.warn("[Leaderboard] Supabase fetch failed:", error.message, "→ using localStorage");
        const local = getLocalEntries();
        const result = local.slice().sort((a, b) => b.score - a.score).slice(0, TOP_N);
        console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
        return result;
      }

      const entries = (data ?? []).map((row: { initials: string; score: number }) => ({
        initials: String(row.initials ?? "").slice(0, 3) || "???",
        score: Number(row.score) ?? 0,
      }));
      console.log("[Leaderboard] Loaded", entries.length, "entries from Supabase (persisted in DB)");
      return entries;
    } catch (e) {
      console.warn("[Leaderboard] Supabase error:", e, "→ using localStorage");
      const local = getLocalEntries();
      const result = local.slice().sort((a, b) => b.score - a.score).slice(0, TOP_N);
      console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
      return result;
    }
  }

  if (!isSupabaseConfigured()) {
    console.log("[Leaderboard] Supabase not configured (.env missing) → using localStorage");
  }
  const local = getLocalEntries();
  const result = local.slice().sort((a, b) => b.score - a.score).slice(0, TOP_N);
  console.log("[Leaderboard] Loaded", result.length, "entries from localStorage");
  return result;
}

/** Submit a score: Supabase first (when configured), then localStorage. */
export async function submitScore(initials: string, score: number): Promise<void> {
  const entry: LeaderboardEntry = {
    initials: String(initials).toUpperCase().slice(0, 3) || "???",
    score,
  };

  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log("[Leaderboard] Submitting to Supabase…", entry);
      const { error } = await supabase.from(TABLE).insert(entry);

      if (error) {
        console.warn("[Leaderboard] Supabase submit failed:", error.message, "→ saving to localStorage");
        const entries = getLocalEntries();
        entries.push(entry);
        entries.sort((a, b) => b.score - a.score);
        setLocalEntries(entries.slice(0, TOP_N));
        console.log("[Leaderboard] Score saved to localStorage");
        return;
      }

      console.log("[Leaderboard] Score saved to Supabase (persisted in DB)");
      return;
    } catch (e) {
      console.warn("[Leaderboard] Supabase error on submit:", e, "→ saving to localStorage");
      const entries = getLocalEntries();
      entries.push(entry);
      entries.sort((a, b) => b.score - a.score);
      setLocalEntries(entries.slice(0, TOP_N));
      console.log("[Leaderboard] Score saved to localStorage");
      return;
    }
  }

  if (!isSupabaseConfigured()) {
    console.log("[Leaderboard] Supabase not configured (.env missing) → saving to localStorage");
  }
  const entries = getLocalEntries();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  setLocalEntries(entries.slice(0, TOP_N));
  console.log("[Leaderboard] Score saved to localStorage");
}

/** True if this score would be in the top 10. */
export async function isTop10(score: number): Promise<boolean> {
  const list = await getLeaderboard();
  if (list.length < TOP_N) return true;
  return score > (list[list.length - 1]?.score ?? -1);
}
