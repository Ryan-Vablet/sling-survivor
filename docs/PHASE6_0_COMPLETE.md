# Phase 6.0 — Cosmetic Sprite Pass (Player Rocket + Enemy UFO Variants)

## Overview

Phase 6.0 is **visual only**: no gameplay balance, collision, or economy changes. The player is rendered as a rocket sprite, and all enemy drones use a shared UFO sprite with variant tint/scale and a subtle wobble.

## Assets

| Asset | Path | Purpose |
|-------|------|---------|
| Player rocket | `public/assets/player_rocket.png` | Replaces placeholder circle; faces right at 0 rad |
| Enemy UFO | `public/assets/enemies/ufo.png` | Used for all enemy types (Common, Shooter, Elite) |

Assets are loaded once in `loadAssets()` and cached; no per-frame loading.

## A) Player Rocket Sprite

- **Source**: `src/app/scene/RunScene.ts`
- Replaced the `gfxWorld.circle(...)` player body with a `Sprite` from `/assets/player_rocket.png`.
- **Anchor**: `0.5, 0.5` (center).
- **Position**: `player.pos.x`, `player.pos.y` each frame.
- **Rotation**: `Math.atan2(player.vel.y, player.vel.x)` so the rocket faces its velocity (sprite art must face right at 0 rad).
- **Fallback**: If the rocket texture fails to load, the original blue circle is still drawn.
- **Thrust**: Unchanged; procedural flame in `drawThrustFlame()` remains separate (direction from keyboard input, not velocity).
- No white outline or extra visuals; sprite is drawn as-is.

## B) Enemy UFO Sprite

- **Source**: `src/app/scene/RunScene.ts` (drone rendering loop), `src/render/assets.ts` (load/cache).
- All drones render as a `Sprite` from `/assets/enemies/ufo.png`.
- **Anchor**: `0.5, 0.5`.
- **Position**: `enemy.pos.x`, `enemy.pos.y`.
- **Scale** and **tint** vary by type (see D).
- **Collision**: Unchanged; hitboxes still use existing `d.radius` (visual only).

## C) Enemy Wobble

- **Per-enemy phase**: Each `Drone` has a `wobblePhase` (0..2π) set at spawn via `rng.nextFloat() * Math.PI * 2` (or `Math.random()` for debug spawn).
- **Formula**: `rotation = sin(time * wobbleSpeed + wobblePhase) * wobbleAmplitude`.
- **Defaults**: `wobbleAmplitude = 0.06` rad (~3.4°), `wobbleSpeed = 2.5`; time from `performance.now() * 0.001`.
- Wobble is visual only; physics and collisions are unchanged.

**Files**:
- `src/sim/entities.ts` — `Drone` type extended with `wobblePhase: number`.
- `src/sim/systems/EnemySpawner.ts` — sets `wobblePhase` when creating drones.

## D) Enemy Variants (Tint + Scale)

Same base UFO texture for all; differentiation by `.tint` and `.scale`:

| Type | Condition | Tint | Scale |
|------|-----------|------|--------|
| Common | chaser, !elite | `0xFFFFFF` | 1.0 |
| Shooter | `droneType === "shooter"` | `0x66FFEE` | 1.05 |
| Elite | `elite === true` | `0xFF77AA` | 1.20 |

Boss type is not present in the current entity set; when added, use tint `0xFFAA55` and scale `1.35` as specified.

## E) Asset Loading and Perf

- **File**: `src/render/assets.ts`
- `loadAssets()` loads `/assets/player_rocket.png` and `/assets/enemies/ufo.png` once and caches them in module-level variables.
- `getRocketTexture()` and `getUfoTexture()` return the cached textures (or `null` if load failed).
- Sprites are created once per drone (on first appearance) and reused via `droneSprites` Map; removed and destroyed when the drone is dead/gone. No per-frame `Assets.load`; minimal allocations.

## F) Acceptance Checklist

1. **Player**: Rocket sprite faces right at rest and rotates with velocity; no gameplay change.
2. **Enemies**: Rendered as UFO sprites; collision radius unchanged.
3. **Wobble**: Visible and desynchronized across enemies (per-enemy `wobblePhase`).
4. **Variants**: Shooter (cyan/teal, slightly larger) and Elite (magenta/pink, larger) distinguishable from Common (white, base size).
5. **No gameplay changes**: Hitboxes, damage, speed, and economy unchanged.

## G) Implementation Summary

| Step | Done |
|------|------|
| 1. Player rocket sprite swap | ✅ RunScene: rocket sprite, fallback circle |
| 2. Enemy sprite rendering | ✅ UFO sprites in `droneContainer`, map by `d.id` |
| 3. Wobble | ✅ `wobblePhase` on Drone, `sin(time * speed + phase) * amp` |
| 4. Tint + scale variants | ✅ Common / Shooter / Elite mapping |
| 5. Collisions unaffected | ✅ Only rendering changed; radius used for hitbox only |
| 6. Documentation | ✅ This file |

## Files Touched

- `src/render/assets.ts` — Load and cache rocket + UFO textures; export getters.
- `src/sim/entities.ts` — `Drone.wobblePhase` added.
- `src/sim/systems/EnemySpawner.ts` — Set `wobblePhase` on spawn (both normal and `spawnShooterNear`).
- `src/app/scene/RunScene.ts` — Rocket sprite, drone container + map, drawWorld updates, `clearDroneSprites()` on reset.

## Sprite Contract

- Player rocket: see `docs/SPRITE_CONTRACT_PLAYER_ROCKET.md` (orientation, anchor, rotation formula).
- Enemy UFO: anchor center; rotation used only for wobble; collision remains radius-based.
