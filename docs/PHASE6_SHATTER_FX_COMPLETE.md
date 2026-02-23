# Phase 6.x — Enemy Death Impact: Shatter Burst + Boom Glow (PixiJS)

## Overview

Phase 6.x is **visual only**: no gameplay balance or collision changes. When an enemy is destroyed, instead of vanishing it spawns:

1. **Shatter burst** — The enemy’s current appearance is snapshotted to a RenderTexture, sliced into 12–20 fragments that fly outward with random velocity and spin, then fade out over ~0.5–0.9 s and are cleaned up.
2. **Boom glow** — A short bright flash and an optional expanding ring/shockwave at the death position.

FX respect pause (upgrade overlay, merchant) and are cleared on run/rocket reset.

## Trigger Point

- **Where**: Enemy death in the sim (drone killed by projectile, `d.hp <= 0`).
- **Flow**: `CollisionSystem.step()` records a `DroneDeathEvent` (id, pos, vel, elite, droneType) and returns `{ deaths }`. In `RunScene.drawWorld()`, when removing dead drone sprites, for each dead id we look up the death event and call `fxManager.spawnEnemyDeathFx(renderer, sprite, death.pos, death.vel)` **before** removing/destroying the sprite. The enemy is then removed from the sim and its sprite destroyed as usual; the FX run independently.

## Architecture

| Module | Role |
|--------|------|
| `src/fx/ExplosionFx.ts` | Single death effect: snapshot → RenderTexture, slice into fragments, flash + ring; `update(dt)` advances and returns `true` when done. |
| `src/fx/FxManager.ts` | Holds a container and list of `ExplosionFx`; `spawnEnemyDeathFx(renderer, enemySprite, worldPos, enemyVel)`; `update(dt, paused)`; `clear()` on reset. |
| `src/app/scene/RunScene.ts` | Creates `FxManager`, adds its container to `layers.world` (above drones, below HUD); captures `deaths` from `collide.step()`; spawns FX and clears death list; calls `fxManager.update(dt, runState.paused)`; calls `fxManager.clear()` in `resetRun()` and `resetRocket()`. |
| `src/sim/systems/CollisionSystem.ts` | Returns `{ deaths: DroneDeathEvent[] }` from `step()`; one event per drone killed that frame. |

## Tuning

All FX tuning lives under `TUNING.fx` in `src/content/tuning.ts`:

| Key | Default | Purpose |
|-----|---------|--------|
| `shatterGridW` | 5 | Grid columns for fragment slice |
| `shatterGridH` | 3 | Grid rows (5×3 = 15 fragments) |
| `shatterLifetimeSec` | 0.75 | Time until fragments are removed and RT destroyed |
| `shatterSpeedMin` | 120 | Min outward speed (px/s) |
| `shatterSpeedMax` | 260 | Max outward speed |
| `shatterDrag` | 2.0 | Velocity multiplier per second (exp(-drag * dt)) |
| `shatterGravity` | 40 | Downward acceleration (px/s²) |
| `flashLifetimeSec` | 0.18 | Flash circle duration |
| `ringLifetimeSec` | 0.3 | Shock ring expand/fade duration |

## Shatter Implementation (Summary)

- Snapshot: temporary container with a sprite using the same texture as the enemy, current tint/scale/rotation; render to a RenderTexture (size from texture×scale, clamped).
- Slice: grid W×H; each cell becomes a Texture frame on that RT and a fragment Sprite; fragments positioned to reconstruct the sprite, then placed in a world container at `worldPos`.
- Motion: per-fragment random outward velocity (plus a bit of enemy vel), random angular velocity; drag and gravity applied each frame; alpha and optional scale-over-lifetime for fade.
- Cleanup: when lifetime exceeds shatter duration, fragment sprites destroyed with `{ texture: true }`; RenderTexture destroyed when the effect completes; no long-lived references.

## Boom Glow

- **Flash**: Filled circle (Graphics), alpha ~0.9 → 0 over `flashLifetimeSec`, slight scale-up.
- **Ring**: Stroked circle, radius ~10 → ~60 over `ringLifetimeSec`, warm color, alpha fades out.

## Pause / Scene Safety

- `FxManager.update(dt, paused)` does not advance effects when `paused` is true (e.g. upgrade overlay, merchant).
- `resetRun()` and `resetRocket()` call `fxManager.clear()` so no FX persist across restarts.

## Acceptance Checklist

1. Killing a UFO produces shatter fragments that visibly match the UFO sprite (tint, scale, wobble baked in).
2. Fragments fly outward, spin, and fade out smoothly.
3. A bright flash/glow appears at the moment of death.
4. Optional ring expands and fades for extra impact.
5. No noticeable frame hitch when 1–3 enemies die.
6. FX stop during pause and resume correctly.
7. No texture leak; RenderTextures and fragment textures are destroyed when the effect ends.
