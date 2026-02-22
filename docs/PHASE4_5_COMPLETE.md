# Phase 4.5 — Distance Tiers (Risk/Reward Bands)

## Overview

Phase 4.5 introduces data-driven distance tiers that increase both difficulty and rewards as the player pushes further. Tiers are visible via a HUD badge, transition toasts, and ground color changes.

## Tier Definitions

| Tier | Name | Start | Scrap x | Coin x | HP x | Speed x | Shooter + | Elite + |
|------|------|-------|---------|--------|------|---------|-----------|---------|
| T0 | Low Orbit | 0m | 1.00 | 1.00 | 1.00 | 1.00 | +0% | +0% |
| T1 | Debris Field | 1000m | 1.25 | 1.25 | 1.20 | 1.05 | +5% | +0% |
| T2 | Asteroid Belt | 2000m | 1.50 | 1.50 | 1.45 | 1.10 | +10% | +2% |
| T3 | Deep Space | 3000m | 2.00 | 2.00 | 1.85 | 1.15 | +15% | +5% |

## Data Model

### Files

- `src/content/tiers/tierTypes.ts` — `TierDef`, `TierReward`, `TierDifficulty`, `TierVisuals` types
- `src/content/tiers/tierDefs.ts` — 4 tier definitions + `getTierForDistance()` lookup

### TierDef Schema

```typescript
type TierDef = {
  id: string;
  name: string;
  startMeters: number;
  reward: { scrapMult: number; coinGoldMult: number };
  difficulty: {
    enemyHpMult: number;
    enemySpeedMult: number;
    shooterChanceAdd: number;
    eliteChanceAdd: number;
  };
  visuals: {
    groundColor: number;
    groundStroke: number;
    accentColor: number;
  };
  shortLabel: string;
};
```

## TierSystem

- **File**: `src/sim/systems/TierSystem.ts`
- Determines `currentTier` based on player distance each tick
- Exposes `tierJustChanged` flag for transition detection
- Reset on rocket/run reset

## Applied Multipliers

### Enemy Spawner

- `hp = baseHp * tier.difficulty.enemyHpMult` (per-instance, not global)
- `speed = baseSpeed * tier.difficulty.enemySpeedMult` (stored on Drone entity)
- Shooter spawn chance = `base + tier.difficulty.shooterChanceAdd`
- Elite bonus chance = `tier.difficulty.eliteChanceAdd` (additive random roll)

### Drone Entity

- Added `speed: number` field to `Drone` type
- DroneAI now uses `d.speed` instead of reading TUNING constants directly

### Scrap Reward

On enemy kill: `scrapGain = killsDelta * TUNING.scrap.perKill * tier.reward.scrapMult`
(then artifact multiplier applied on top)

### World Coin Gold

On coin pickup: `goldGain = TUNING.worldCoins.goldPerPickup * tier.reward.coinGoldMult`
(then artifact multiplier applied on top)

## UI

### HUD Tier Badge

- Displays `T2 — Asteroid Belt` below the main stats, colored with `tier.visuals.accentColor`
- Below that, a compact line showing all multipliers: `Scrap x1.50  Coin x1.50  HP x1.45  Spd x1.10`

### Tier Transition Toast

When tier changes during flight:
```
ENTERING T2 — Asteroid Belt
Scrap x1.50  Gold x1.50
```
Displayed for 2 seconds via the existing Toast component.

## Ground Visuals

- Ground fill color driven by `tier.visuals.groundColor`
- Ground stroke color driven by `tier.visuals.groundStroke`
- Changes instantly on tier transition (re-rendered each frame via Graphics)

| Tier | Ground Color | Stroke Color |
|------|-------------|-------------|
| T0 | `0x1b2a3a` (dark blue) | `0x2d4a5e` |
| T1 | `0x1f2a2a` (dark teal) | `0x33554a` |
| T2 | `0x2a1f2a` (dark purple) | `0x553355` |
| T3 | `0x2a1a1a` (dark red) | `0x553333` |

## File Changes Summary

| File | Change |
|------|--------|
| `src/content/tiers/tierTypes.ts` | NEW — tier type definitions |
| `src/content/tiers/tierDefs.ts` | NEW — 4 tier defs + lookup function |
| `src/sim/systems/TierSystem.ts` | NEW — runtime tier tracking |
| `src/sim/entities.ts` | Added `speed` field to `Drone` |
| `src/sim/systems/EnemySpawner.ts` | Accepts `TierDef`, applies HP/speed/shooter/elite multipliers per-instance |
| `src/sim/systems/DroneAI.ts` | Uses `d.speed` instead of TUNING constants |
| `src/app/scene/RunScene.ts` | Wires TierSystem, passes tier to spawner, applies tier mults to scrap/gold, uses tier ground colors, passes tier data to HUD |
| `src/ui/Hud.ts` | Added tier badge + multiplier info display |

## Future-Proofing

The `TierVisuals` type is extensible for future biome work:
- Background textures/sprites
- Spawn table overrides
- Music/ambient changes
- Particle effects

All tier data is in `tierDefs.ts` — no hardcoded tier logic in systems.
