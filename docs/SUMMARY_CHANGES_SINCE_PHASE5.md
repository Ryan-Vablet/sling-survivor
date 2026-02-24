# Summary of Changes Since Phase 5

This document summarizes work done in **Phase 6** and follow-up changes (enemy death FX, touch/mobile controls, coins, and related fixes).

---

## 1. Phase 6.0 — Cosmetic Sprite Pass

- **Player:** Rendered as rocket sprite (`player_rocket.png`), center anchor, rotation from velocity; fallback circle if texture missing.
- **Enemies:** All drones use shared UFO sprite (`ufo.png`) with variant tint/scale (Common white, Shooter cyan, Elite magenta) and per-enemy **wobble** (`wobblePhase`, `sin(time * speed + phase) * amplitude`).
- **Collision:** Unchanged; hitboxes still use existing radius (visual only).
- **Docs:** `docs/PHASE6_0_COMPLETE.md`.

---

## 2. Phase 6.x — Enemy Death: Shatter Burst + Boom Glow

**Goal:** When an enemy is destroyed, show a shatter effect and boom glow instead of vanishing.

### 2.1 Architecture

| Item | Location | Purpose |
|------|----------|--------|
| **ExplosionFx** | `src/fx/ExplosionFx.ts` | Single death effect: boom (flash + ring) + shatter fragments; `update(dt)` returns `true` when done. |
| **FxManager** | `src/fx/FxManager.ts` | Holds FX container; `spawnEnemyDeathFx(renderer, enemySprite, worldPos, enemyVel)`; `update(dt, paused)`; `clear()` on reset. |
| **CollisionSystem** | `src/sim/systems/CollisionSystem.ts` | `step()` returns `{ deaths: DroneDeathEvent[] }` (id, pos, vel, etc.) for drones killed that frame. |
| **RunScene** | `src/app/scene/RunScene.ts` | Creates FxManager; captures `deaths` from `collide.step()`; before removing dead drone sprite calls `fxManager.spawnEnemyDeathFx(...)`; `fxManager.update(dt, runState.paused)`; `fxManager.clear()` in `resetRun()` / `resetRocket()`. |

### 2.2 Shatter (current implementation)

- **Source:** Enemy’s **texture** sliced into a grid (no RenderTexture for fragments; PixiJS v8 sub-frame from RT was unreliable).
- **Grid:** `TUNING.fx.shatterGridW` × `shatterGridH` (default 5×3 = 15 fragments).
- **Scale:** Each fragment uses scale `(sx/gw, sy/gh)` so the grid matches ship size; a **size nudge** (3.54) makes fragments slightly larger for visibility.
- **Motion:** Random outward velocity + enemy vel, random spin, drag, light gravity; alpha/scale fade over `shatterLifetimeSec`; fragments and textures cleaned up when done.

### 2.3 Boom glow

- **Flash:** Filled circle, alpha 0.9 → 0 over `flashLifetimeSec`, slight scale-up.
- **Ring:** Stroked circle, radius 10 → 60 over `ringLifetimeSec`, warm color, fades out.

### 2.4 Tuning (`TUNING.fx` in `src/content/tuning.ts`)

- `shatterGridW`, `shatterGridH`, `shatterLifetimeSec`, `shatterSpeedMin/Max`, `shatterDrag`, `shatterGravity`, `flashLifetimeSec`, `ringLifetimeSec`.

### 2.5 Fixes applied

- Removed `tex.clone()` (not a function in PixiJS); use same texture for snapshot sprite.
- Fragment visibility: use slices of **enemy texture** (`new Texture({ source: tex.source, frame })`) instead of RenderTexture slices.
- Fragment size: explicit scale `(sx/gw, sy/gh)` and stored `fragScaleX/Y` for update; then size nudge (1.18 → 3.54) for “chunkier” pieces.
- Draw order: boom drawn first, then fragments, so fragments appear on top.

**Docs:** `docs/PHASE6_SHATTER_FX_COMPLETE.md`.

---

## 3. Touch / Drag Controls (Virtual Joystick)

**Goal:** Support touch and drag for launcher and in-flight thrust; whole screen acts as virtual joystick (up = W, etc.).

### 3.1 Thrust input

- **`src/core/input/ThrustInput.ts`**
  - `IThrustInput`: `getAxis(): { x, y }` (-1..1).
  - `virtualJoystickAxis(startX, startY, currentX, currentY)`: normalized direction from drag offset, with **dead zone** (18px).
  - **CombinedThrustInput:** Wraps keyboard + drag state + `isLaunched`. `getAxis()` uses keyboard first; if no keys and launched + pointer down, uses virtual joystick from drag start → current position.
- **BoostThrustSystem:** Now takes `IThrustInput` instead of `Keyboard`; uses `input.getAxis()`.
- **RunScene:** Builds `CombinedThrustInput(this.kb, this.drag.state, () => this.player.launched)`; passes it to `thrust.step()` and `drawThrustFlame()` so thrust and flame work from both keyboard and touch.

### 3.2 Launcher

- Unchanged logic; **PointerDrag** on game canvas already uses pointer events (mouse + touch). Pull back and release to launch works with touch.

### 3.3 Touch behavior

- **PointerDrag** (`src/core/input/PointerDrag.ts`): `el.style.touchAction = "none"`; `preventDefault()` on pointerdown and pointermove (`passive: false`) so the page doesn’t scroll or zoom while dragging.

---

## 4. Mobile Detection and Virtual Joystick Visual

**Goal:** On mobile, show a virtual joystick in the bottom-right that **displays** the current thrust input (display only; control remains full-screen drag).

### 4.1 Mobile detection

- **`src/core/device.ts`:** `isMobileDevice()` returns `navigator.maxTouchPoints > 0`.

### 4.2 Joystick widget (RunScene)

- **When:** Created only if `isMobileDevice()` and not already created (once per RunScene).
- **Where:** Bottom-right; position set in resize handler: `(viewWidth - margin - baseDiameter, viewHeight - margin - baseDiameter)`.
- **Visual:** Base circle (r=44, dark fill, light stroke); **stick** (small circle) position updated every frame from `thrustInput.getAxis()` so it reflects current thrust direction.
- **Direction arrows:** Four triangles (up, right, down, left) drawn **outside** the base circle (gap 10px) so they don’t overlap the knob travel; white fill/stroke, same style as base.
- **Constants:** `JOYSTICK_BASE_R`, `JOYSTICK_STICK_R`, `JOYSTICK_STICK_TRAVEL`, `JOYSTICK_MARGIN`, `JOYSTICK_ARROW_GAP`, `JOYSTICK_ARROW_SIZE`.

---

## 5. Coins — 2× Size and Clean Multiple for DPI

- **Tuning:** `TUNING.worldCoins.coinSize` changed from **24 → 48** (2×, integer multiple for DPI).
- **RunScene:** Already used `coinSize` for world coin sprites (no code change needed).
- **ReplayScene:** Coin sprites now use `TUNING.worldCoins.coinSize` for `width`/`height` instead of a fixed scale so replay coins match run coins.

---

## 6. Files Touched (Summary)

| Area | Files |
|------|--------|
| **FX** | `src/fx/ExplosionFx.ts`, `src/fx/FxManager.ts`, `src/content/tuning.ts` (fx block) |
| **Collision** | `src/sim/systems/CollisionSystem.ts` (death events) |
| **Thrust / input** | `src/core/input/ThrustInput.ts`, `src/core/input/PointerDrag.ts`, `src/sim/systems/BoostThrustSystem.ts` |
| **Device** | `src/core/device.ts` |
| **Run scene** | `src/app/scene/RunScene.ts` (FxManager, deaths, thrust input, virtual joystick UI, resize) |
| **Replay** | `src/app/scene/ReplayScene.ts` (coin size from tuning) |
| **Docs** | `docs/PHASE6_SHATTER_FX_COMPLETE.md`, `docs/SUMMARY_CHANGES_SINCE_PHASE5.md` (this file) |

---

## 7. Acceptance / Behavior Summary

- **Death FX:** Killing a UFO produces shatter fragments (matching ship tint/scale), boom flash + ring; FX respect pause and clear on reset; no texture leaks.
- **Controls:** WASD and full-screen touch/drag both drive thrust; launcher works with touch (pull back, release); touch doesn’t scroll/zoom the page.
- **Mobile:** On touch devices, bottom-right joystick and arrows show current thrust direction; control is still full-screen drag (or keyboard).
- **Coins:** World and replay coins are 2× size (48px), clean multiple for DPI.
