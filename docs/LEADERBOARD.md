# Leaderboard System

This document describes how the Sling Survivor leaderboard works: data model, storage (local + Supabase), submission flow, replay verification, and UI.

---

## 1. Overview

- **Ranking:** By **distance** (meters traveled). Top 10 per board.
- **Two boards:** **Local** (this device only, `localStorage`) and **Global** (Supabase, when configured).
- **On game over:** If the run qualifies for top 10 (local and/or global), the player is prompted for **initials** (1–3 chars), then the score is saved locally and/or submitted to the global leaderboard via an Edge Function.
- **Global submission** requires a **replay URL**: the client uploads the replay to Supabase Storage first; the Edge Function verifies the replay and only then inserts the row (Matt-proof: no direct client INSERT).

---

## 2. Data Model

### 2.1 Leaderboard entry (client + API)

Defined in `src/api/leaderboard.ts` as `LeaderboardEntry`:

| Field        | Type   | Description |
|-------------|--------|-------------|
| `initials`  | string | 1–3 chars, uppercased |
| `distance`  | number | Meters traveled (primary for ranking) |
| `scrap`     | number | Total scrap earned |
| `gold`      | number | Gold at end of run (after merchant spending) |
| `totalGoldEarned` | number? | Total gold earned during run (never reduced by spending). Gold spent = totalGoldEarned − gold. Optional for old entries. |
| `summaryJson` | string? | JSON of `RunSummaryData` for "View summary" |
| `replayUrl` | string? | Public URL of replay in Supabase Storage |
| `gameVersion` | string? | From `VERSION` (for filtering by version) |

### 2.2 Run summary (stored with entry)

`RunSummaryData` in `src/app/types/runSummary.ts`: initials, distanceM, scrap, gold, round, totalKills, level, upgrades, evolutions, artifacts, optional replayUrl/gameVersion, and client-side `score` (from `computeRunScore()`). Stored as `summary_json` in the DB and used by SummaryScene and by the leaderboard overlay’s "View" action.

### 2.3 Supabase table

Schema in `docs/SUPABASE_LEADERBOARD_SCHEMA.sql`:

- **Table:** `public.leaderboard`
- **Columns:** `id` (identity), `initials`, `score` (legacy, same as distance), `distance`, `scrap`, `gold`, `total_gold_earned` (optional), `summary_json`, `replay_url`, `game_version`, `cheater` (boolean, default false), `created_at`.
- **Cheater flag:** Set `cheater = true` in the dashboard (or via SQL) to hide an entry from the normal global leaderboard. Flagged entries appear only in the **h4x0rs** section at the bottom of the Global tab.
- **RLS:** Enabled. **Select** allowed for `anon` (public read). **Insert** not allowed for `anon`; only the Edge Function (service_role) inserts.

---

## 3. Client-Side Flow

### 3.1 Configuration

- **Supabase:** Used only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (`src/api/supabase.ts`). Otherwise the app runs without global leaderboard (local only).
- **Local storage key:** `sling-survivor-leaderboard`; holds an array of entries (max 10, sorted by distance).

### 3.2 Game over and submission

1. **RunScene** (game over path) builds `RunSummaryData` (distance, scrap, gold, round, kills, level, upgrades, evolutions, artifacts, replay payload, game version).
2. Replay is saved locally via `saveLocalReplay()` (for replays list).
3. **`trySubmitScoreAndThen(summaryData, onDone)`**:
   - Computes `distance = Math.round(summaryData.distanceM)`.
   - Checks **local** top 10: `isLocalTop10(distance)` (compare to current local list).
   - Checks **global** top 10: `await isGlobalTop10(distance)` (fetch global list when Supabase configured).
   - If **neither** top 10 → call `onDone()` (go to Summary) and skip initials.
   - If **either** top 10 → **`showInitialsPrompt(stats, async (initials) => { ... })`** (DOM modal, 3-letter input).
4. In the initials callback:
   - Set `summaryData.initials = initials`.
   - If there is `replayPayload`, call **`uploadReplay(summaryData.replayPayload)`** to upload gzipped JSON to Supabase Storage bucket `replays`; set `summaryData.replayUrl` to the public URL (or leave unset on failure).
   - Build **payload**: distance, scrap, gold, summary (full RunSummaryData), replayUrl, gameVersion.
   - Set `summaryData.highScoreAchieved` (initials, distance, local, global) for SummaryScene highlight.
   - Call **`submitScore(initials, payload, { toLocal, toGlobal })`**.
5. **`submitScore()`** (`src/api/leaderboard.ts`):
   - Builds a normalized **entry** via `makeEntry(initials, payload)` (initials 1–3, distance/scrap/gold, summaryJson, replayUrl, gameVersion).
   - If `toLocal`: **`submitToLocal(entry)`** — append to local array, sort by distance, keep top 10, write to `localStorage`.
   - If `toGlobal`: **`submitToGlobal(initials, payload)`** — invokes Supabase Edge Function **`submit-score`** with body: initials, distance, scrap, gold, summary_json, replay_url, game_version. No direct table insert from client.
6. After submission, `onDone()` runs → switch to **Summary** scene with `summaryData` (including highScoreAchieved and replayUrl if set).

### 3.3 Replay upload

- **`src/app/replay/uploadReplay.ts`**: Takes `ReplayData`, stringifies and gzips it, uploads to Storage bucket `replays` with path `{uuid}.json.gz`, returns the public URL or `null`. Used only when submitting to global so the Edge Function can verify.

---

## 4. Edge Function: submit-score

**Location:** `supabase/functions/submit-score/index.ts`.

**Purpose:** Accept a score payload from the client (anon) and **insert** into `leaderboard` only after **replay verification**. Clients cannot INSERT into the table directly (RLS); only this function uses the service_role key.

**Flow:**

1. **CORS:** Respond to OPTIONS; accept POST only.
2. **Parse body:** initials (1–3 chars), distance, scrap, gold, summary_json (optional string), replay_url (required), game_version (optional string). Validate types and non-negative numbers.
3. **Replay verification:**
   - **Fetch** the replay from `replay_url` (public Storage URL).
   - **Decompress** gzip and parse JSON.
   - **Compute stats** from replay snapshots: max distance, last snapshot’s gold and totalScrap (with a `hasTotalScrap` flag for format).
   - **Compare** to submitted payload (allow 1 unit tolerance for rounding): distance, gold, and (if replay has totalScrap) scrap must match. If any mismatch → 400 with message (e.g. "Replay verification failed: distance does not match replay").
4. **Insert:** Create Supabase client with **service_role** key; `insert(validated.row)` into `leaderboard`. Return 200 `{ ok: true }` or 400 on error.

So: **replay_url is required** for global submit; the function refuses to insert if the replay is missing, unparseable, or if the replayed stats don’t match the claimed score (Matt-proof).

---

## 5. Viewing the Leaderboard

### 5.1 Title scene

- **"LEADERBOARDS"** button opens **LeaderboardOverlay** (`src/ui/LeaderboardOverlay.ts`).
- Overlay is a **DOM** panel (arcade-style: green/amber on dark). It has:
  - **Tabs:** Global (default) / Local.
  - **Columns:** #, INITIALS, DIST, SCRAP, GOLD, actions.
  - **Actions per row:** "View" (opens Summary with that entry’s data), "Replay" (if `replayUrl` and `onPlayReplay` provided).
- **Data source:** Global tab → `getGlobalLeaderboard()` (Supabase select). Local tab → `getLocalLeaderboard()` (localStorage). No mixing; global tab shows only Supabase data.
- **View:** Uses `getSummaryFromEntry(entry)` to parse `summaryJson` into `RunSummaryData`; if missing, builds minimal summary from entry fields. Then calls `onViewSummary(summary)` so the app can switch to Summary scene with that data.
- **Replay:** If the entry has a `replayUrl` and the overlay was shown with `onPlayReplay`, "Replay" calls `onPlayReplay(replayUrl)` (e.g. switch to Replay scene with that URL).

### 5.2 Initials prompt

- **`showInitialsPrompt(stats, onSubmit)`** in `LeaderboardOverlay.ts`: one-off DOM modal. Shows distance/scrap/gold, input for 3 letters, Submit button. On submit, closes and calls `onSubmit(initials)` with trimmed, uppercased, max 3 chars (or `"???"` if empty).

---

## 6. Summary Scene and Replay

- **SummaryScene** can be entered with **full** run data (game over) or with **stored** data (from leaderboard "View"). It shows run stats, upgrades, evolutions, artifacts, and optionally a "Replay" button if `replayUrl` is present.
- **Replay scene** can load a replay from a URL (e.g. from leaderboard "Replay"); it fetches the gzipped JSON, decompresses, and plays back.

---

## 7. Files Reference

| Area | Files |
|------|--------|
| **API** | `src/api/leaderboard.ts` (entries, local/global fetch, submit, makeEntry, getSummaryFromEntry), `src/api/supabase.ts` (client only when env set) |
| **Types** | `src/app/types/runSummary.ts` (RunSummaryData, computeRunScore) |
| **Submission flow** | `src/app/scene/RunScene.ts` (trySubmitScoreAndThen, submitScore, showInitialsPrompt, uploadReplay) |
| **Replay upload** | `src/app/replay/uploadReplay.ts` |
| **UI** | `src/ui/LeaderboardOverlay.ts` (overlay, tabs, View/Replay, showInitialsPrompt) |
| **Edge Function** | `supabase/functions/submit-score/index.ts` (validate, fetch replay, verify stats, insert with service_role) |
| **Schema** | `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` (table, RLS, storage bucket `replays` and policies) |

---

## 8. Supabase Setup Checklist

1. **Table:** Run `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` in SQL Editor (creates `leaderboard`, adds columns if missing, RLS, no anon insert).
2. **Storage:** Create bucket **`replays`** (Public). Run the storage policies in the same SQL file (anon insert + anon select for `replays`).
3. **Edge Function:** Deploy **`submit-score`** (Supabase CLI or Dashboard). Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set for the function.
4. **Env:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the app so the client can read leaderboard and invoke `submit-score`, and upload replays to Storage.

---

## 9. Current Behavior Summary

- **Ranking:** Distance only; top 10 per board (local and global).
- **Local:** Always available; stored in `localStorage`; no replay required.
- **Global:** Only when Supabase is configured; requires replay upload and replay verification by the Edge Function; replay_url required in submit body.
- **Initials:** Asked only when the run is in the top 10 (local or global); 1–3 characters; saved with the entry.
- **View / Replay:** Leaderboard overlay shows Global and Local; "View" opens Summary with that entry’s summary (or minimal data); "Replay" opens Replay scene with that entry’s replay URL when available.
