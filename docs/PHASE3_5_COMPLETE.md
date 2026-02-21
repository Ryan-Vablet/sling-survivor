# Phase 3.5 — Loop Restructure (Complete)

## Overview

Converted the game from single-run-to-death into a multi-launch rounds system with XP leveling and currency-based round tolls.

**XP is ONLY for upgrades. Coins are ONLY for round survival.** These systems are fully decoupled.

## Core Loop

```
RUN
 └─ ROUND 1 (toll: 100)
     ├─ Rocket 1 → earn XP + coins → crash → toll check
     ├─ Rocket 2 → earn XP + coins → crash → toll check
     └─ Rocket 3 → earn XP + coins → crash → toll check or game over
 └─ ROUND 2 (toll: 170)
     ├─ Rocket 1 ...
     └─ ...
```

### Rocket End Flow

1. Player stalls or HP reaches 0 → rocket ends.
2. **If coins >= roundCoinToll**: toll is paid, round advances, rockets reset to 3, toll scales by 1.7x.
3. **Else**: rocketsRemaining decremented.
   - If rockets > 0: relaunch with same upgrades/evolutions/coins/XP.
   - If rockets == 0: **GAME OVER**.

### What Persists Across Rockets

- Applied upgrades and evolutions
- Weapon loadout and derived stats
- Coins and XP
- Round and level counters

### What Resets Per Rocket

- Player position, velocity, HP, boost
- Temporary debuffs (dragDebuffT, stallT)
- Per-rocket kills/hits counters
- All enemies, projectiles, enemy bullets
- Spawner, weapon, and AI system timers

## XP System

| Source | Amount |
|--------|--------|
| Distance | 50 XP per km (background trickle) |
| Kill | 25 XP per kill |

- Base XP to first level: **50**
- Level scaling: **x1.35** per level
- Distance XP is a background contributor to prevent dead runs; kills are the primary driver
- On level-up: upgrade overlay appears (same 3-choice system)
- Old milestone-based triggers have been fully removed

## Currency System

| Source | Amount |
|--------|--------|
| Kill | 8 coins per kill |

- Coins accumulate globally across rockets
- Coins are only consumed by round tolls

## Round Toll

| Round | Toll |
|-------|------|
| 1 | 100 |
| 2 | 170 |
| 3 | 289 |
| 4 | 491 |
| 5 | 835 |

- Toll formula: `baseToll * (tollScale ^ (round - 1))`
- `baseToll = 100`, `tollScale = 1.7`
- Checked at the end of each rocket

## Tuning Values

```
rounds.startingRockets   = 3
rounds.baseToll          = 100
rounds.tollScale         = 1.7

xp.baseToLevel           = 50
xp.levelScale            = 1.35
xp.perKm                 = 50
xp.perKill               = 25
xp.coinPerKill           = 8
```

## HUD Changes

**Top-left text** now shows:
- Round number, rockets remaining, coins/toll progress
- Distance, speed, kills, hits

**Top-right bars** now include:
- HP bar (red)
- Boost bar (blue)
- XP bar (green) with level indicator

## RunState Additions

New fields on `RunState`:
- `currentRound`, `rocketsRemaining`, `coins`, `roundCoinToll`
- `currentXp`, `xpToNextLevel`, `currentLevel`, `totalKills`

Removed fields:
- `nextUpgradeDistM`, `nextUpgradeKills` (milestone system)

## Files Modified

| File | Change |
|------|--------|
| `src/content/tuning.ts` | Removed `milestones`, added `rounds` + `xp` sections |
| `src/sim/runtime/RunState.ts` | Added round/rocket/coin/XP fields, removed milestone fields |
| `src/sim/systems/UpgradeSystem.ts` | Replaced `checkMilestone` with `checkLevelUp` |
| `src/app/scene/RunScene.ts` | Added `resetRocket`, `endRocket`, XP/coin tracking, multi-rocket flow |
| `src/ui/Hud.ts` | Added XP bar, level label, round/rockets/coins display |
| `src/ui/EndScreen.ts` | Increased panel height for round info |
| `README.md` | Updated game loop documentation |

## Acceptance Tests

1. Player launches, earns XP from distance and kills, levels up, upgrade overlay appears.
2. Player earns coins from kills (visible in HUD).
3. Player crashes: rocketsRemaining decreases.
4. If rocketsRemaining > 0: relaunch with same upgrades/evolutions/coins.
5. If coins >= roundCoinToll: toll is paid, round advances, rockets reset.
6. If rockets reach 0 before toll paid: game over screen with round/kills/level/upgrades.
7. Evolutions still trigger correctly across rockets.
8. UpgradeOverlay pause freezes ALL sim (including shooter bullets, enemy AI).
