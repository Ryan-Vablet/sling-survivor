# Phase 1 — Complete

Everything accomplished from the initial scaffold through to a playable Phase 1 build.

---

## Core Mechanics (all working)

### Anchored Slingshot Launch
- **Pull-back slingshot** anchored to a fixed launcher position (world coords 120, 320)
- Drag away from the launcher and release — launch direction matches the pull-back vector
- Power scales with pull distance, clamped by `maxPullDist` (400px)
- Visual feedback: rubber-band line (pointer → anchor) + gold direction indicator extending from anchor
- Player sits on the launcher until deliberately slung — physics, enemies, and stall detection are all gated behind `player.launched`

### Boost Thrust (WASD / Arrow Keys)
- Full-direction thrust while any direction key is held and boost meter > 0
- Boost drains at 14/s while thrusting (~7s to empty)
- Boost regenerates at 8/s when not thrusting (~12.5s to full)
- Thrust acceleration: 1400 px/s²
- Visual: 3-circle flame trail behind the player opposite to thrust direction, with per-frame jitter

### Momentum Penalty on Hit
- Drone-player contact multiplies velocity by 0.75× (instant slowdown)
- Applies a temporary drag debuff (0.75s of extra air drag)
- Deals 2 HP damage per contact frame
- Drones are pushed away on contact to prevent continuous overlap

### Stall / Run End
- Speed below 35 px/s for 1.5 continuous seconds triggers run end
- HP reaching 0 also ends the run
- End screen shows distance, kills, hits, speed, and a composite score
- Click to restart — properly resets all state without auto-launching

---

## Systems

### Physics (`PhysicsWorld`)
- Gravity: 900 px/s²
- Air drag: 0.02 proportional (+ 0.08 during drag debuff)
- Ground collision with bounce (0.15) and friction (0.12)
- Terrain: gentle sine-wave hills (`groundYAt(x)`)

### Enemies (`EnemySpawner` + `DroneAI`)
- Drones spawn every 2s, max 8 alive at once
- Spawn ahead of the player (600–1000px right, 200–450px above)
- Simple pursuit AI: fly directly toward the player at 220 px/s
- 20 HP each

### Auto-Weapon (`WeaponSystem`)
- Auto-fires at the nearest drone within 520px range
- Cooldown: 0.35s between shots
- Projectiles: 900 px/s, 10 damage, 1.2s lifetime

### Collision (`CollisionSystem`)
- Projectile-vs-drone: damage + kill tracking
- Drone-vs-player: momentum penalty + drag debuff + HP damage
- Dead entity cleanup: back-to-front splice removal every frame (was a no-op bug, fixed)

---

## Rendering & UI

### Title Screen
- Full-viewport background image (`title_mockup.png`) with cover-fit scaling
- Gold beveled "LAUNCH" button with floating animation (sine bob + scale pulse + subtle tilt)
- Animated spinning coin sprite proof-of-concept (128×128, 8-frame spritesheet)

### Run Scene Visuals
- Parallax starfield: 140 stars with per-star depth factors (0.01–0.07), tiled across viewport
- Ground terrain fill with surface highlight stroke and distance tick marks (every 200px, major every 1000px)
- Ground extends full viewport width to the left — no clipping
- Launcher base marker (gold circle at origin)
- Player: blue circle with thrust flame when boosting
- Drones: pink circles
- Projectiles: white circles

### Camera
- Smooth-follow camera (critically damped lerp, factor 8)
- Tracks player at ~33% from left, ~55% from top

### HUD
- Top-left: distance (m), speed, kills, hits
- Top-right: HP bar (red) + boost bar (blue), both with outline and fill

### End Screen
- Semi-transparent dark panel with run stats and score
- Click-to-restart with proper state cleanup

---

## Infrastructure

### Scene System
- `IScene` interface with `enter()`, `exit()`, `update(dt)`, optional `fixedUpdate(dt)`
- `SceneManager` handles lifecycle, stage cleanup, and factory-based scene creation
- Scenes: `TitleScene`, `RunScene`

### Fixed Timestep Loop
- 60 Hz fixed update with accumulator pattern
- Max 5 sub-steps per frame to prevent spiral of death
- Frame delta clamped to 0.25s (tab-switch protection)

### Input
- `PointerDrag`: tracks drag state with `released` flag for clean slingshot gating
- `Keyboard`: WASD + arrow key axis input with blur-clear

### Tuning
- All gameplay constants centralized in `src/content/tuning.ts`
- Launcher origin, power range, pull distance
- Player stats, boost rates, stall thresholds
- Enemy spawn rates, speed, contact penalties
- Weapon cooldown, range, projectile speed, damage

### Asset Pipeline
- Vite dev server with HMR
- Static assets served from `public/` (title mockup, coin spritesheet)
- Pixi `Assets.load()` for async texture loading
- Spritesheet slicing: dynamic frame-width detection from texture dimensions

---

## Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| Launch direction inverted | `dx = start - current` instead of anchor-based | Rewrote to anchored slingshot (`anchor - pointer`) |
| Auto-launch on scene entry | `PointerDrag` initial state `isDragging: false` passed launch check | Added `released` flag + `freshReset` frame-delay gate |
| Auto-launch on restart | Restart click's pointer events set `released: true` | `resetRun()` clears drag state; `freshReset` discards first-frame release |
| Dead entities never cleaned up | Cleanup loop body was empty (`if (!p.alive) {}`) | Back-to-front splice removal for both projectiles and drones |
| Debug key `d` conflicted with WASD | Same key used for thrust-right and debug toggle | Changed debug toggle to backtick |
| Player fell off launcher before sling | Gravity ran before `player.launched` | Gated all physics/AI/weapons behind `player.launched` |
| Ground clipped before left screen edge | Draw range started only 200px left of player | Extended to full `viewW` left of player |
| System state leaked across restarts | `EnemySpawner` and `WeaponSystem` kept old timers/IDs | Added `reset()` methods, called in `resetRun()` |
| `npm` blocked by PowerShell execution policy | Unsigned `.ps1` script | Set execution policy to `RemoteSigned` |
