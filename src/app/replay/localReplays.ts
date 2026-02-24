/**
 * Local replay storage (localStorage). Saves last N runs so you can watch your own replays.
 */
import type { ReplayData } from "./replayTypes";

const STORAGE_KEY = "sling-survivor-local-replays";
const MAX_SAVED = 5;

export type LocalReplayMeta = {
  id: string;
  savedAt: number;
  distanceM: number;
};

type StoredEntry = LocalReplayMeta & { replay: ReplayData };

function getStored(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(entries: StoredEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("[LocalReplays] Failed to save:", e);
  }
}

/** List of saved local replays (metadata only, for UI). Newest first. */
export function getLocalReplays(): LocalReplayMeta[] {
  const entries = getStored();
  return entries
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(({ id, savedAt, distanceM }) => ({ id, savedAt, distanceM }));
}

/** Get full replay data by id. Returns null if not found or invalid. */
export function getLocalReplayData(id: string): ReplayData | null {
  const entries = getStored();
  const entry = entries.find((e) => e.id === id);
  if (!entry?.replay?.snapshots?.length) return null;
  return entry.replay;
}

/** Save a run's replay locally. Keeps only the last MAX_SAVED runs. Returns the replay id, or undefined if not saved. */
export function saveLocalReplay(
  replay: ReplayData,
  meta: { distanceM: number }
): string | undefined {
  if (!replay?.snapshots?.length) return undefined;
  const entries = getStored();
  const id = crypto.randomUUID();
  const entry: StoredEntry = {
    id,
    savedAt: Date.now(),
    distanceM: meta.distanceM,
    replay,
  };
  const next = [entry, ...entries]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_SAVED);
  setStored(next);
  return id;
}
