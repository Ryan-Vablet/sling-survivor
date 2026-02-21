# Sling Survivor

A 2D launcher-first rocket game built with Vite + TypeScript + PixiJS.

## Requirements

- Node 18+ recommended

## Install & Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
```

## Controls

| Input | Action |
|-------|--------|
| Drag mouse | Slingshot launch (pull back from anchor, release to fire) |
| WASD / Arrows | Boost thrust while fuel > 0 |
| 1 / 2 / 3 | Select upgrade card during pick screen |
| `` ` `` (backtick) | Toggle debug overlay |
| U | Force an upgrade pick (debug) |
| E | Force evolution check (debug) |
| P | Spawn a shooter drone nearby (debug) |

## URL Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `seed` | `?seed=12345` | Fix the RNG seed for a deterministic run |

## Upgrades & Milestones

During a run, upgrade picks are triggered at distance and kill milestones:

- **First distance milestone:** 300m, then every 500m
- **First kills milestone:** 5 kills, then every 10 kills

When a milestone is reached, the sim pauses and 3 upgrade cards appear. You must pick one to resume. Upgrades stack (unless marked non-stackable).

### Available Upgrades

| Upgrade | Rarity | Effect |
|---------|--------|--------|
| Boost Regen +25% | Common | Boost regen +25% while not thrusting |
| Thrust Power +15% | Common | Thrust acceleration ×1.15 |
| Drag Resist | Common | Drag debuff duration ×0.8 |
| Reinforced Hull | Rare | Retain 10% more speed on contact |
| Rapid Fire | Common | Auto-cannon cooldown ×0.88 |
| Armor Piercing | Common | Auto-cannon +2 damage |
| Double Tap | Epic | Auto-cannon +1 extra projectile (max 2 stacks) |
| High Velocity | Common | All projectile speed ×1.2 (max 3 stacks) |
| Stall Grace | Rare | Stall timer +0.5s |
| Fuel Tank | Common | Boost capacity +20 |
| Hull Plating | Common | Max HP +20 |
| Rear Blaster | Epic | Unlock rear-facing weapon |

### Weapons

| Weapon | Acquire | Tags | Notes |
|--------|---------|------|-------|
| Auto-Cannon | Default | `ballistic`, `auto` | Fires at nearest drone |
| Rear Blaster | Upgrade unlock | `ballistic`, `rear` | Fires behind velocity vector |
| Rail Cannon | Evolution | `ballistic`, `auto`, `piercing`, `rail` | Pierces up to 5 enemies per shot |

Weapons support upgrade mods (cooldown, damage, speed, extra shots) via tag matching.

### Weapon Evolutions

Evolutions transform a weapon when upgrade prerequisites are met.

| Evolution | Recipe | Result |
|-----------|--------|--------|
| Auto → Rail Cannon | Double Tap ×1 + High Velocity ×1 + Armor Piercing ×1 | Auto-Cannon replaced by Rail Cannon |

Evolutions trigger automatically after picking the qualifying upgrade. A toast notification and screen shake confirm the evolution.

## Enemies

### Chaser Drones
- Chase the player directly; deal contact damage + momentum penalty
- Every 5th spawn is an **elite**: larger, faster, 60 HP, 4 contact damage

### Shooter Drones
- Appear after 200m (~25% of spawns)
- Maintain distance (350–550px), strafe when in range
- Fire slow bullets (350 px/s) every 1.5s
- Bullets apply light momentum penalty (vel ×0.9) + 0.3s drag debuff + 1 damage
- Visually orange with ring outline; bullets are red-orange

### Ramp
- Spawn interval decreases with distance (min 0.8s)
- Max alive increases with distance (cap 15)

## Architecture

```
src/
  content/        ← pure data: tuning, upgrade defs, weapon defs, evolution defs
  core/           ← engine: input, RNG, math, debug
  sim/            ← runtime: entities, physics, systems, RunState
  ui/             ← Pixi UI: HUD, end screen, upgrade overlay
  app/            ← boot, scenes (Title, Run)
  render/         ← camera, layers, asset loading
```

Upgrades are data-driven: definitions in `src/content/upgrades/`, runtime effects computed in `RunState`, applied by `UpgradeSystem`. Evolutions are data-driven: definitions in `src/content/evolutions/`, checked by `EvolutionSystem` after each upgrade apply. Baseline stats come from `TUNING`; derived stats are recomputed on each upgrade/evolution application.
