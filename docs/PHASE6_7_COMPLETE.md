# Phase 6.7 — Replay UX Polish (Complete)

## Overview

Replays now use the **same RunScene renderer** as live gameplay. Replay mode drives RunScene from recorded snapshots (interpolation, same HUD, same viewport, same FX). ReplayScene is **load-only**: it fetches replay data (or uses in-memory data) and then switches to RunScene with `scenes.data.replayData` set.

No core gameplay logic or balance was changed.

---

## A) HUD completeness during replay

- **Source**: `src/app/scene/RunScene.ts` (replay branch in `updateReplay()` and HUD update), `src/ui/Hud.ts` (unchanged; single component used for both live and replay).
- During replay, the **same** `Hud` instance is updated with:
  - **Current round** — `runState.currentRound`
  - **Round toll** — `runState.roundToll` (scrap required)
  - **Rockets remaining** — `runState.rocketsRemaining`
  - **Tier badge + tier multipliers** — `tierSys.currentTier` (label, name, accent, scrap/coin/HP/speed mults)
  - Plus scrap, gold, distance, speed, kills, hits, HP, boost, XP, level, artifacts (same as live).
- Replay snapshots carry `roundToll` and `rocketsRemaining` in `ReplaySnapshotRunState`; older replays without these fields get defaults from `TUNING.rounds.baseToll` and `TUNING.rounds.startingRockets`.
- **No duplicate HUD**: RunScene uses one `Hud` for both live and replay.

---

## B) Visual parity (same rendering pipeline)

- Replay uses the **same RunScene** as live:
  - Same Pixi scene graph (`layers`, `gfxWorld`, `droneContainer`, `coinContainer`, `rocketSprite`, `gfxThrustFlame`, etc.).
  - Same sprites (rocket, UFO drones with wobble, coin animated sprites).
  - Same animations (coin bob, drone wobble).
  - Same shatter/explosion FX via `FxManager` (death events from replayed drone removals).
  - Same tier ground coloring (`tierSys.currentTier.visuals`).
  - Same camera and viewport: `Camera2D`, `cam.follow()`, same scale and world-to-screen mapping.
- **ReplayScene** no longer does playback: it only loads replay (from URL or `scenes.data.replayData`), then sets `scenes.data.replayData` and calls `scenes.switchTo("run")`. RunScene enters with replay data and runs in “replay mode”.
- **fixedUpdate** is skipped when `this.replayData` is set; **update()** runs the replay branch (`updateReplay()`), which advances replay time, interpolates snapshots, applies state to `player`, `runState`, `drones`, `worldCoins`, updates `tierSys`, then runs the same camera/HUD/drawWorld path as live.

---

## C) Replay speed controls

- **Location**: Bottom-right overlay (DOM), added when entering RunScene in replay mode.
- **Buttons**: `[ 1x ] [ 2x ] [ 3x ]`. Clicking sets `this.replaySpeed` to 1, 2, or 3.
- Replay delta time is multiplied: `this.replayTime += dt * this.replaySpeed`. Physics and FX advance according to this multiplier (replay has no live physics; interpolation uses `replayTime`).
- Default speed is **1x**. Active speed is highlighted (different background/color).
- **Source**: `RunScene.addReplayUi()`.

---

## D) Exit replay

- **EXIT** button in the replay overlay: clears replay data, removes overlay, and `scenes.switchTo("title")`.
- **ESC** key: same behavior (exit replay, go to title). Handler is registered in `setupReplayEsc()` and removed in `RunScene.exit()`.
- Replay end (game_over event or `replayTime >= duration`): shows “Replay complete — Click to exit”; click or EXIT/ESC returns to title. No summary screen for replay-only exit.
- FX and entities are cleared when leaving (normal RunScene teardown; replay state is nulled so no further replay updates run).

---

## E) Replay label

- **Text**: `"REPLAY"`.
- **Position**: Top center of the overlay (flex container with `inset: 0` over the canvas parent).
- **Style**: Low opacity (`rgba(255,255,255,0.4)`), small font (12px), non-intrusive.
- Rendered in the same DOM overlay as speed and EXIT (`addReplayUi()`).

---

## F) Data consistency

- Replay uses **recorded seed** (`RunState` is built with `replayData.seed`).
- Replay uses **recorded snapshots** only: interpolation between `ReplaySnapshot` frames; no live simulation.
- **Initial state** comes from the first snapshot (`applyReplaySnapshotToState(replayData.snapshots[0])`); subsequent frames from `getInterpolatedReplayState(replayTime)`.
- Round goals, tier thresholds, artifact effects, etc. are **not** re-simulated; they are reflected in the snapshot’s `runState` (round, roundToll, rocketsRemaining, level, distanceM, scrap, gold). Tier for display is derived from `tierSys.update(distanceM)` so ground color and HUD tier match the recorded distance.

---

## G) Acceptance tests

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Replay visuals match live (sprites, explosions, wobble, tiers) | ✅ Same RunScene and drawWorld |
| 2 | HUD shows round, toll, rockets, tier during replay | ✅ Same hud.update() with runState + tierSys |
| 3 | Replay viewport matches live (size and scale) | ✅ Same Camera2D and cam.follow |
| 4 | Speed buttons change playback rate (1x/2x/3x) | ✅ replaySpeed, dt * replaySpeed |
| 5 | EXIT button returns to menu | ✅ switchTo("title") |
| 6 | “REPLAY” label visible but subtle | ✅ Top of overlay, low opacity |
| 7 | No duplicate rendering pipelines (single RunScene) | ✅ ReplayScene is load-only; RunScene does playback |

---

## H) Implementation summary

| Step | Done |
|------|------|
| 1. Refactor replay to drive RunScene | ✅ enter() replay branch, updateReplay(), applyReplaySnapshotToState, getInterpolatedReplayState, applyReplayState |
| 2. Full HUD in replay | ✅ Same HUD data from runState + tierSys in updateReplay() |
| 3. Camera/viewport parity | ✅ Same cam and drawWorld; no separate ReplayScene renderer |
| 4. Speed controls 1x/2x/3x | ✅ addReplayUi() buttons, replaySpeed, dt * replaySpeed |
| 5. Exit button + ESC | ✅ EXIT in overlay, setupReplayEsc(), showReplayEndOverlay() |
| 6. REPLAY label | ✅ In same overlay, top center, low opacity |
| 7. PHASE6_7_COMPLETE.md | ✅ This document |

---

## Files touched

- **RunScene.ts**: Replay state (`replayData`, `replayTime`, `replaySpeed`, `replayEventIndex`, etc.), replay enter branch, `fixedUpdate` early return, `updateReplay()`, `applyReplaySnapshotToState()`, `getInterpolatedReplayState()`, `applyReplayState()`, `ensureReplayCoinSprites()`, `showReplayEndOverlay()`, `addReplayUi()`, `setupReplayEsc()`, exit cleanup for replay UI/ESC.
- **ReplayScene.ts**: `enter()` reduced to load (fetch if URL) then set `scenes.data.replayData` and `switchTo("run")`; no playback or own renderer.
- **replayTypes.ts**: (already had `roundToll`, `rocketsRemaining` in `ReplaySnapshotRunState`.)
- **ReplayRecorder.ts**: (already records `roundToll`, `rocketsRemaining` in snapshots.)

Older replays without `roundToll`/`rocketsRemaining` in snapshots are handled with `(rs as ...).roundToll ?? TUNING.rounds.baseToll` (and same for rocketsRemaining) when applying snapshot/runState.
