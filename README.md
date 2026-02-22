# Sling Survivor

A 2D launcher-first rocket game built with Vite + TypeScript + PixiJS.

## Versioning (AI-iteration)

The app shows a version badge in the **bottom-right** corner (from `src/version.ts`).

We use a two-part scheme suited to iterating with an AI assistant:

| Part | Meaning | When to bump |
|------|---------|----------------|
| **Milestone** | Agreed “we hit a goal” (e.g. first deploy, feature-complete, 1.0). | When you and the AI agree a milestone is reached. |
| **Iteration** | One step of work (each prompt exchange that changes the project). | On every such change; the AI bumps it. Resets to `0` when Milestone bumps. |

**Display:** `v{Milestone}.{Iteration}` — e.g. `v0.6` → after a milestone → `v1.0` → `v1.1` …

**Single source of truth:** root `VERSION` file (one line, e.g. `0.6` or `1.0`). The app reads it at build time. Edit this file to bump version; the AI increments the iteration number when it edits the project; you bump the milestone (e.g. to `1.0`) when you hit a goal.

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

## Game Loop

Each **run** consists of multiple **rounds**. Each round gives the player a limited number of **rockets** (launch attempts).

| Concept | Description |
|---------|-------------|
| Rocket | One slingshot launch. Earn XP + scrap + gold during flight. |
| XP | Gained from distance + kills. Triggers upgrade picks on level-up. |
| Scrap | Gained from kills (10/kill). Pays round tolls. Resets on round clear. |
| Gold | Earned from excess scrap + world coin pickups. Spent at the Merchant. |
| Round Toll | Pay scrap to advance to the next round. Rockets reset. |
| Game Over | Rockets reach 0 before toll is paid. |

Upgrades and evolutions persist across rockets within the same run.

### XP & Leveling

XP is earned primarily from kills (25 XP / kill) with a small background trickle from distance (50 XP / km). When enough XP is accumulated, the player levels up and 3 upgrade cards appear between rockets. XP scaling: each level requires 1.35x more XP than the previous.

### Scrap, Gold & Toll

Kills grant scrap (10 / kill). Scrap accumulates across rockets and pays the round toll. On round clear, excess scrap converts to gold at 50%, plus a bonus of 15 gold per remaining rocket. Scrap resets to 0. Toll scales 1.7x per round.

Gold is also earned by flying through world coin pickups (5 gold each). Gold persists across rounds and is spent at the **Merchant** after each round clear.

### Merchant

After clearing a round, the Merchant scene appears. The player can spend gold on:

- **4 upgrade cards** (from the existing upgrade pool, priced 40–80 gold by rarity)
- **2 artifact cards** (unique per-run items, priced 120–160 gold)

Purchased artifacts are removed from the pool for future visits. Click **CONTINUE** to return to the game.

### Artifacts

| Artifact | Cost | Effect |
|----------|------|--------|
| Extra Rocket | 150 | +1 rocket per round |
| Scrap Magnet | 120 | +25% scrap per kill |
| Golden Thrusters | 140 | +20% gold from world coins |
| Emergency Fuel | 160 | +50 max boost capacity |

Artifacts are merchant-only, cannot stack, and persist for the entire run.

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

## Distance Tiers

Pushing further increases both rewards and difficulty. Ground color shifts with each tier.

| Tier | Name | Start | Scrap x | Coin x | HP x | Speed x |
|------|------|-------|---------|--------|------|---------|
| T0 | Low Orbit | 0m | 1.00 | 1.00 | 1.00 | 1.00 |
| T1 | Debris Field | 1000m | 1.25 | 1.25 | 1.20 | 1.05 |
| T2 | Asteroid Belt | 2000m | 1.50 | 1.50 | 1.45 | 1.10 |
| T3 | Deep Space | 3000m | 2.00 | 2.00 | 1.85 | 1.15 |

Tier badge and multipliers are shown in the HUD. A toast appears on tier transitions.

## Enemies

### Chaser Drones
- Chase the player directly; deal contact damage + momentum penalty
- Every 5th spawn is an **elite**: larger, faster, 60 HP, 4 contact damage

### Shooter Drones
- Appear after 200m (~25% base + tier bonus)
- Maintain distance (350–550px), strafe when in range
- Fire slow bullets (350 px/s) every 1.5s
- Bullets apply light momentum penalty (vel ×0.9) + 0.3s drag debuff + 1 damage
- Visually orange with ring outline; bullets are red-orange

### Ramp
- Spawn interval decreases with distance (min 0.8s)
- Max alive increases with distance (cap 15)
- Tier multipliers increase enemy HP, speed, and shooter/elite spawn chances

## Architecture

```
src/
  content/        ← pure data: tuning, upgrade defs, weapon defs, evolution defs, tier defs, artifact defs
  core/           ← engine: input, RNG, math, debug
  sim/            ← runtime: entities, physics, systems, RunState
  ui/             ← Pixi UI: HUD, end screen, upgrade overlay
  app/            ← boot, scenes (Title, Run, Merchant)
  render/         ← camera, layers, asset loading
```

Upgrades are data-driven: definitions in `src/content/upgrades/`, runtime effects computed in `RunState`, applied by `UpgradeSystem`. Evolutions are data-driven: definitions in `src/content/evolutions/`, checked by `EvolutionSystem` after each upgrade apply. Artifacts are data-driven: definitions in `src/content/artifacts/`, applied via `MerchantScene` and stored in `RunState.appliedArtifacts`. Baseline stats come from `TUNING`; derived stats are recomputed on each upgrade/evolution/artifact application. The game loop (rounds, rockets, XP, scrap, gold, toll, merchant) is managed by `RunState` and orchestrated by `RunScene` and `MerchantScene`.
