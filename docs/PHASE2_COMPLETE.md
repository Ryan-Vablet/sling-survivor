# Phase 2 — Complete

## What Was Added

### A) Deterministic RNG + RunState
- `src/core/rng/rng.ts` — Mulberry32 PRNG with `nextFloat`, `nextInt`, `pick`, `shuffle`
- `src/sim/runtime/RunState.ts` — Per-run state: seed, RNG, milestone counters, applied upgrades, weapon loadout, derived stats
- Seed override via `?seed=` URL parameter for reproducible runs
- Enemy spawn positions now use the deterministic RNG instead of `Math.random()`

### B) Upgrade Content (Data-Driven)
- `src/content/upgrades/upgradeTypes.ts` — Typed union for effects: `stat_mult`, `stat_add`, `weapon_mod`, `special`
- `src/content/upgrades/upgradeDefs.ts` — 12 upgrades across boost, thrust, defense, weapon, and survival categories
- `src/content/upgrades/upgradePool.ts` — Pool filtering (respects stackable/non-stackable) and deterministic selection

### C) UpgradeSystem (Runtime)
- `src/sim/systems/UpgradeSystem.ts` — Milestone detection (distance + kills), choice generation, apply logic
- Milestones configurable in `TUNING.milestones` (first at 300m/5 kills, then every 500m/10 kills)
- On apply: RunState recomputes all derived stats; RunScene adjusts player HP/boost for cap increases

### D) Derived Stats Model
- Baseline values from `TUNING`, modifiers from applied upgrades
- `DerivedPlayerStats`: hpMax, boostMax, drain/regen rates, thrust, stall, contact loss, drag debuff
- `DerivedWeaponStats`: per-weapon cooldown, damage, range, projectile speed, extra shots
- Computed event-driven (on upgrade apply), not every frame
- All systems read from derived stats, not directly from `TUNING`

### E) Upgrade Overlay UI
- `src/ui/UpgradeOverlay.ts` — Full-screen dim backdrop + 3 clickable cards
- Cards show name, description, rarity color bar, stack count
- Keyboard support: 1/2/3 to select
- Sim pauses while overlay is open (fixedUpdate early-returns); camera + rendering continue

### F) Multi-Weapon System
- `src/content/weapons/weaponDefs.ts` — Data definitions for Auto-Cannon and Rear Blaster
- `WeaponSystem` rewritten: iterates weapon loadout, per-weapon cooldowns, tag-based mod targeting
- **Auto-Cannon**: fires at nearest drone, supports extra shots with angular spread
- **Rear Blaster**: fires opposite to player velocity, unlocked via epic upgrade

### G) Elite Drone + Gentle Ramp
- `Drone.elite` flag added to entity type
- `EnemySpawner`: every 5th spawn is elite (configurable); spawn interval decreases and max alive increases with distance
- `DroneAI`: elites move at 260 px/s (vs 220 base)
- `CollisionSystem`: elites deal 4 contact damage (vs 2 base)
- Visual: elites rendered larger with a red ring outline

### H) Testing
- Vitest added as dev dependency with minimal config
- `src/core/rng/rng.test.ts` — 6 tests: determinism, bounds, pick, shuffle, seed diversity
- `src/content/upgrades/upgradePool.test.ts` — 6 tests: unique choices, determinism, stackable/non-stackable filtering, edge cases

### I) Debug / Dev UX
- `U` key: force an upgrade pick at any time during a run
- `?seed=12345`: fix RNG seed for deterministic testing/replay
- Chosen upgrades logged to console in dev builds
- End screen shows list of upgrades applied during the run

## Files Created
- `src/core/rng/rng.ts`
- `src/core/rng/rng.test.ts`
- `src/sim/runtime/RunState.ts`
- `src/content/upgrades/upgradeTypes.ts`
- `src/content/upgrades/upgradeDefs.ts`
- `src/content/upgrades/upgradePool.ts`
- `src/content/upgrades/upgradePool.test.ts`
- `src/content/weapons/weaponDefs.ts`
- `src/sim/systems/UpgradeSystem.ts`
- `src/ui/UpgradeOverlay.ts`
- `src/vite-env.d.ts`
- `docs/PHASE2_COMPLETE.md`

## Files Modified
- `src/content/tuning.ts` — added `milestones`, `elite`, `ramp` sections
- `src/sim/entities.ts` — added `elite: boolean` to Drone
- `src/sim/systems/BoostThrustSystem.ts` — reads from `DerivedPlayerStats`
- `src/sim/systems/StallSystem.ts` — reads from `DerivedPlayerStats`
- `src/sim/systems/CollisionSystem.ts` — reads from `DerivedPlayerStats`, elite contact damage
- `src/sim/systems/DroneAI.ts` — elite speed
- `src/sim/systems/EnemySpawner.ts` — elite spawns, ramp curve, deterministic RNG
- `src/sim/systems/WeaponSystem.ts` — multi-weapon, per-weapon cooldowns, tag-based mods
- `src/app/scene/RunScene.ts` — RunState integration, upgrade flow, pause/resume, debug key, elite rendering
- `vite.config.ts` — vitest test config
- `package.json` — vitest dependency, test script
- `index.html` — updated hint text
- `README.md` — full rewrite with upgrade/milestone/debug documentation
