/**
 * Leaderboard API: tries server first, falls back to local storage.
 * Replace LEADERBOARD_API_URL with your backend when ready; local data can be
 * migrated or kept as fallback.
 */

const STORAGE_KEY = "sling-survivor-leaderboard";
const TOP_N = 10;

/** Set to your backend base URL when you have a server (e.g. "https://api.example.com"). */
export const LEADERBOARD_API_URL = "";

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

/** Fetch leaderboard: server first, then local. */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (LEADERBOARD_API_URL) {
    try {
      const res = await fetch(`${LEADERBOARD_API_URL}/leaderboard`);
      if (res.ok) {
        const data = (await res.json()) as { entries?: LeaderboardEntry[] };
        if (Array.isArray(data?.entries)) return data.entries.slice(0, TOP_N);
      }
    } catch {
      // fall through to local
    }
  }
  const local = getLocalEntries();
  return local
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}

/** Submit a score: server first, then local. */
export async function submitScore(initials: string, score: number): Promise<void> {
  const entry: LeaderboardEntry = {
    initials: String(initials).toUpperCase().slice(0, 3) || "???",
    score,
  };

  if (LEADERBOARD_API_URL) {
    try {
      const res = await fetch(`${LEADERBOARD_API_URL}/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) return;
    } catch {
      // fall through to local
    }
  }

  const entries = getLocalEntries();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  setLocalEntries(entries.slice(0, TOP_N));
}

/** True if this score would be in the top 10. */
export async function isTop10(score: number): Promise<boolean> {
  const list = await getLeaderboard();
  if (list.length < TOP_N) return true;
  return score > (list[list.length - 1]?.score ?? -1);
}
