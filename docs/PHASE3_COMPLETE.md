# Phase 3 — Complete

## What Was Added

### A) Data-Driven Weapon Evolution System
- `src/content/evolutions/evolutionTypes.ts` — `EvolutionDef` type: id, name, description, sourceWeaponId, resultWeaponId, requiresUpgrades, oneTime
- `src/content/evolutions/evolutionDefs.ts` — Evolution definitions (currently 1: auto → rail)
- `src/sim/systems/EvolutionSystem.ts` — Checks evolution recipes against RunState; swaps weapons in loadout; records applied evolutions; recomputes derived stats

Evolution behavior:
- Checked immediately after each upgrade apply (in the overlay callback)
- Also manually triggerable via `E` debug key
- Purely deterministic: based on applied upgrades + weapon loadout
- `RunState.appliedEvolutions` (Set) prevents repeat for `oneTime` evolutions

### B) Evolution #1: Auto-Cannon → Rail Cannon

**Recipe:**
| Required Upgrade | Min Stacks |
|-----------------|-----------|
| `extra_shot` (Double Tap) | 1 |
| `projectile_speed_up` (High Velocity) | 1 |
| `cannon_damage_up` (Armor Piercing) | 1 |

**Rail Cannon stats:**
| Stat | Value |
|------|-------|
| Cooldown | 0.75s (vs 0.35s auto-cannon) |
| Damage | 40 (vs 10 auto-cannon) |
| Projectile Speed | 1400 px/s (vs 900) |
| Range | 700 px (vs 520) |
| Pierce Count | 5 enemies per shot |
| Tags | `ballistic`, `auto`, `piercing`, `rail` |

The `auto` tag is preserved so existing auto-cannon upgrades (Rapid Fire, Armor Piercing) continue to apply after evolution.

### C) Piercing Projectile System

Added to `Projectile` entity:
- `piercing: boolean` — rendering flag
- `pierceLeft: number` — remaining enemies this shot can pass through
- `hitIds: number[]` — drone IDs already hit (prevents double-hit per frame)

`CollisionSystem` behavior:
- If `piercing && pierceLeft > 0`: damage drone, record hitId, decrement pierceLeft, projectile stays alive
- If `pierceLeft === 0` or not piercing: projectile despawns on hit (existing behavior)

Visual: piercing projectiles render as larger cyan circles with a glow halo.

### D) Shooter Drone (New Enemy Type)

**Entity changes:**
- `Drone.droneType: "chaser" | "shooter"` field added
- `Drone.shootTimer: number` — per-drone fire cooldown
- `EnemyBullet` type added (separate from player Projectile)

**Shooter behavior (DroneAI):**
- Maintains preferred distance from player (350–550px)
- Moves toward player if too far, retreats if too close, strafes if in range
- Fires a slow bullet at player every 1.5s when within engagement range

**Shooter drone tuning:**
| Stat | Value |
|------|-------|
| Speed | 180 px/s |
| HP | 15 |
| Radius | 12 px |
| Fire Cooldown | 1.5s |
| Bullet Speed | 350 px/s |
| Bullet Damage | 1 |
| Bullet SpeedRetain | 0.9 (light momentum penalty) |
| Bullet DragDebuff | 0.3s |
| Bullet LifeT | 2.5s |
| Spawn Ratio | 25% (after 200m) |

**Enemy bullet collision:**
- Handled in `CollisionSystem`: enemy bullets vs player
- Apply momentum penalty (`vel *= speedRetain`), drag debuff, and damage
- Separate cleanup loop for enemy bullets

**Spawner rules:**
- Shooter drones start appearing after 200m distance
- ~25% of spawns are shooters (tunable)
- Shooters are never elite (mutually exclusive)

**Visual:**
- Shooter drones: orange with orange ring outline
- Enemy bullets: red-orange circles (distinct from white/cyan player projectiles)

### E) Toast UI + Screen Shake

- `src/ui/Toast.ts` — Simple Pixi Text overlay: shows message for ~2.5s with fade-out
- Screen shake on evolution: 0.3s duration, intensity 8 (applied as random offset to world container)
- Toast displays "EVOLVED: auto_cannon → Rail Cannon" on evolution trigger

### F) Debug Keys

| Key | Action |
|-----|--------|
| `E` | Force evolution check (triggers if recipe met) |
| `P` | Spawn a shooter drone near player |
| `U` | Force upgrade pick (existing) |

### G) Pause Safety

All new timers (shooter cooldowns, enemy bullet lifetimes) advance inside `fixedUpdate`, gated by the `runState.paused` early return. The invariant comment is updated to list all timer types.

## Files Created
- `src/content/evolutions/evolutionTypes.ts`
- `src/content/evolutions/evolutionDefs.ts`
- `src/sim/systems/EvolutionSystem.ts`
- `src/ui/Toast.ts`

## Files Modified
- `src/sim/entities.ts` — Added `DroneType`, `EnemyBullet`; extended `Drone` (droneType, shootTimer) and `Projectile` (piercing, pierceLeft, hitIds)
- `src/content/weapons/weaponDefs.ts` — Added `basePierceCount` to `WeaponDef`; added `rail_cannon` definition
- `src/content/tuning.ts` — Added `shooter` section (all shooter drone + bullet tuning)
- `src/sim/runtime/RunState.ts` — Added `pierceCount` to `DerivedWeaponStats`; added `appliedEvolutions` set
- `src/sim/systems/WeaponSystem.ts` — Set piercing/pierceLeft/hitIds on emitted projectiles
- `src/sim/systems/CollisionSystem.ts` — Piercing hit logic; enemy bullet vs player collision; enemy bullet cleanup
- `src/sim/systems/DroneAI.ts` — Added `reset()`; split into `stepChaser`/`stepShooter`; shooter fires enemy bullets
- `src/sim/systems/EnemySpawner.ts` — Shooter drone spawning logic; `spawnShooterNear()` debug helper
- `src/app/scene/RunScene.ts` — EvolutionSystem + Toast + enemyBullets wiring; debug keys E/P; shake; updated rendering for shooter drones, enemy bullets, piercing projectiles
- `index.html` — Updated hint text with new debug keys
