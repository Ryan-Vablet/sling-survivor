# Phase 7 — Asteroids (Tier-based Environmental Enemy) — Complete

## Overview

Asteroids are tier-driven environmental obstacles: they drift through space, do not chase or shoot, and force navigation decisions. They are destructible, grant scrap, and use the same shatter FX as drones. UFO logic and the tier system are unchanged; asteroids are additive.

---

## A) Tier integration

- **`TierEnvironment`** added in `src/content/tiers/tierTypes.ts`:
  - `asteroidDensity: number` (0..1) — spawn rate = baseAsteroidRate × asteroidDensity.
  - `coinHeightLift: number` — extra vertical lift (px) for coin spawn base Y.
- **`TierDef`** now includes `environment: TierEnvironment`.
- **Initial values** in `src/content/tiers/tierDefs.ts`:
  - T0: `asteroidDensity: 0`, `coinHeightLift: 0`
  - T1: `0.25`, `0`
  - T2: `0.35`, `18`
  - T3: `0.45`, `18`
- Spawning uses **only** `tier.environment.asteroidDensity` (no hardcoded "if tier >= 2").

---

## B) Asteroid entity

- **`Asteroid`** type in `src/sim/entities.ts`:
  - `pos`, `vel`, `radius`, `hp`, `spriteIndex` (1–6), `sizeClass` ("small" | "medium" | "large"), `rotation`, `spinSpeed`, `alive`, `scrapReward`.
- **Sizes** (before tier multipliers) in `TUNING.asteroid`:
  - Small: scale 0.7, hp 40, radius 18, scrapReward 20
  - Medium: scale 1, hp 90, radius 28, scrapReward 35
  - Large: scale 1.3, hp 160, radius 40, scrapReward 50
- Asteroids **do not target the player**; they drift (negative X + slight Y). Rotation updated each step with `spinSpeed`. Culled when far behind camera (`TUNING.asteroid.cullBehindPx`).

---

## C) Sprites

- **Assets**: `public/assets/enemies/asteroid_1.png` … `asteroid_6.png` loaded in `src/render/assets.ts`; `getAsteroidTexture(index)` returns texture for sprite index 1–6.
- **Rendering** in `RunScene.drawWorld()`:
  - Anchor 0.5, scale = base scale × `TUNING.asteroid[sizeClass].scale`, `rotation = a.rotation` (updated in spawner drift step).
  - One sprite per asteroid, created on first draw; removed on death or cull.

---

## D) Spawning

- **`AsteroidSpawner`** in `src/sim/systems/AsteroidSpawner.ts`:
  - Spawn interval = `TUNING.asteroid.baseSpawnInterval / tier.environment.asteroidDensity` (when density > 0).
  - Max alive cap: `TUNING.asteroid.maxAlive` (25).
  - Spawns **ahead** of player (X + 700…1200), random Y in playfield, slight random velocity (drift left + small vertical).
  - Size class from RNG (50% small, 35% medium, 15% large); sprite index 1–6 from RNG; HP scaled by `tier.difficulty.enemyHpMult`.
  - Uses `runState.rng` so spawn pattern is deterministic from run seed.
- Runs in `RunScene.fixedUpdate()` alongside UFO spawner; **not** run in replay mode (replay branch returns before spawners).

---

## E) Collision and damage

- **Projectiles vs asteroids** (in `CollisionSystem.step`):
  - Hit: asteroid HP reduced by projectile damage; if HP ≤ 0, asteroid marked dead and `asteroidDeaths` event pushed (id, pos, vel, scrapReward). Projectile set not alive (no pierce through asteroids).
- **Player vs asteroid**:
  - On overlap: `player.vel *= TUNING.asteroid.playerMomentumRetain` (0.35), `player.hp -= TUNING.asteroid.playerContactDamage` (2), `player.hits += 1`. Asteroid is **not** instantly destroyed.
- **`CollisionSystem.step`** now takes `asteroids: Asteroid[]` and returns `{ deaths, asteroidDeaths }`. Dead asteroids are spliced in the same step.

---

## F) Rewards and FX

- **Scrap**: On each `asteroidDeaths` entry, `scrapReward × tier.reward.scrapMult` (and ×1.25 if scrap_magnet artifact) is added to `runState.scrap` and `runState.totalScrap`.
- **FX**: In `drawWorld`, for each `asteroidDeathsThisFrame`, `fxManager.spawnEnemyDeathFx(renderer, sprite, pos, vel)` is called (same shatter + boom as drones), then the asteroid sprite is removed and destroyed.

---

## G) Coin height (Tier 2+)

- **`spawnCoinsAhead()`** in RunScene uses `this.tierSys.currentTier.environment.coinHeightLift`.
  - `baseY = groundY - 120 - coinHeightLift - rng.nextFloat() * 130`.
  - T2 and T3 have `coinHeightLift: 18`, so coins spawn slightly higher (more negative Y), encouraging upward boost in asteroid-heavy tiers.

---

## H) Cleanup and safety

- **Cull**: `cullOffScreenAsteroids()` removes asteroids with `pos.x < player.pos.x - TUNING.asteroid.cullBehindPx` (1800 px). Sprites removed and destroyed; no points or FX.
- **Cap**: Spawner does not spawn when `alive >= TUNING.asteroid.maxAlive` (25).
- **Pause**: Asteroids are updated only in `fixedUpdate`, which returns when `runState.paused`.
- **Replay**: `fixedUpdate` returns when `replayData` is set, so no asteroid spawn or collision in replay.

---

## I) Acceptance tests

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Tier 0: no asteroids | ✅ density 0 → no spawns |
| 2 | Tier 1+: asteroids appear and drift | ✅ density 0.25/0.35/0.45 |
| 3 | UFOs still spawn normally | ✅ EnemySpawner unchanged, runs before AsteroidSpawner |
| 4 | Asteroids collide with player, momentum loss | ✅ playerMomentumRetain 0.35, contact damage 2 |
| 5 | Asteroids destructible, grant scrap | ✅ projectiles deal damage; scrap = scrapReward × tier mult |
| 6 | Shatter FX on destruction | ✅ spawnEnemyDeathFx for each asteroid death |
| 7 | Coin spawn height higher in Tier 2+ | ✅ coinHeightLift 18 for T2/T3 |
| 8 | Asteroid density increases in Tier 3 | ✅ T2 0.35, T3 0.45 |
| 9 | No infinite accumulation offscreen | ✅ cullBehindPx 1800, maxAlive 25 |

---

## Implementation order (done)

1. Extended `TierDef.environment` (asteroidDensity, coinHeightLift).
2. Asteroid entity + sprite rendering (entities.ts, assets, drawWorld).
3. AsteroidSpawner driven by tier density (RNG, interval, size class, drift).
4. Collisions: projectiles vs asteroids, player vs asteroid (CollisionSystem).
5. FX on death + scrap rewards (asteroidDeathsThisFrame, FxManager, runState.scrap).
6. Coin height modifier (spawnCoinsAhead + coinHeightLift).
7. Tuning (TUNING.asteroid, tier defs).
8. PHASE7_COMPLETE.md (this file).

---

## Files touched

- `src/content/tiers/tierTypes.ts` — TierEnvironment, TierDef.environment
- `src/content/tiers/tierDefs.ts` — environment per tier
- `src/sim/entities.ts` — Asteroid, AsteroidSizeClass
- `src/content/tuning.ts` — asteroid config (spawn, cap, cull, sizes, player contact)
- `src/render/assets.ts` — load asteroid_1…6, getAsteroidTexture
- `src/sim/systems/AsteroidSpawner.ts` — new spawner (drift, spawn by density)
- `src/sim/systems/CollisionSystem.ts` — asteroids param, projectile vs asteroid, player vs asteroid, AsteroidDeathEvent, cleanup
- `src/app/scene/RunScene.ts` — asteroids state, asteroidSpawner, asteroidContainer/Sprites, clear/cull, fixedUpdate wiring, scrap for asteroid deaths, drawWorld asteroids + death FX, spawnCoinsAhead coinHeightLift
