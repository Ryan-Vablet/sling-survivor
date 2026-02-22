# Phase 4 — Merchant Screen + Shop Items + Artifacts

## Overview

Phase 4 adds a post-round Merchant scene where the player can spend **Gold** on upgrades and special **Artifacts**. The merchant appears after every successful round clear, between the round summary and the next rocket launch.

## New Scene: MerchantScene

- **File**: `src/app/scene/MerchantScene.ts`
- **Trigger**: After round clear → pending upgrades drained → scene switches to `"merchant"`
- **Background**: `merchant_mockup.png` (cover-fit), with a dim overlay for card readability. The "MERCHANT" title is embedded in the background image.
- **Layout**: Animated coin + gold counter (top-right), 6 shop cards (2 rows × 3), reroll button, floating Continue button

### Scene Flow

1. Rocket stalls or HP reaches 0
2. If `scrap >= roundToll`: round clears → gold conversion → end screen shown
3. Player clicks end screen → pending XP upgrades drain → **switch to MerchantScene**
4. Player shops (optional purchases) → clicks **CONTINUE**
5. Scene switches back to `"run"` → `RunScene.enter()` detects returning state → `resetRocket()`

State is preserved across transitions via `SceneManager.data.runState`.

## Shop Cards

Each merchant visit generates exactly 6 cards:

- **3 upgrade cards** (top row): pulled from existing `UpgradeDefs` via `rollUpgradeChoices`, respecting stack limits, prerequisites, and exclusions
- **3 artifact cards** (bottom row): randomly selected from available (unowned) artifacts

### Pricing

| Type | Price |
|------|-------|
| Common upgrade | 40 gold |
| Rare upgrade | 60 gold |
| Epic upgrade | 80 gold |
| Artifacts | Per-artifact (120–160 gold) |

Prices are configured in `TUNING.merchant`.

### Purchase Behavior

- Click an affordable card → gold deducted, effect applied, card grayed out
- Click an unaffordable card → card shakes (visual feedback)
- After each purchase, remaining card affordability updates

### Reroll

- Small button positioned below the bottom-right card
- Muted dark style with a hand-drawn circular refresh arrow icon
- Re-generates all unpurchased shop items (upgrades + artifacts)

## UI Details

### Gold Display

- Animated spinning coin sprite (28×28, loaded from `coin_flip_sheet.png`) displayed next to white text reading `{amount} gold`
- Positioned top-right of the screen
- Updates live after each purchase

### Continue Button

- Styled like the title screen's LAUNCH button but in blue:
  - Blue glow aura (`0x4080ff`)
  - Dark drop shadow base
  - Beveled body (`0x2855b0`) with highlight/shadow bands
  - Crisp blue border (`0x88bbff`) + inner inset line
  - 30px "CONTINUE" text with drop shadow
- Floating animation: bob + drift + gentle scale pulse + subtle tilt (matches title screen)

## Artifact System

### Data Files

- `src/content/artifacts/artifactTypes.ts` — `ArtifactDef` type
- `src/content/artifacts/artifactDefs.ts` — definitions

### ArtifactDef Schema

```typescript
type ArtifactDef = {
  id: string;
  name: string;
  description: string;
  goldCost: number;
};
```

### Initial Artifact Set

| Artifact | Cost | Effect | Implementation |
|----------|------|--------|----------------|
| Extra Rocket | 150 | +1 rocket per round | Applied on round clear + immediate +1 on purchase |
| Scrap Magnet | 120 | +25% scrap per kill | Multiplier applied in `RunScene.fixedUpdate` |
| Golden Thrusters | 140 | +20% gold from world coins | Multiplier applied in `RunScene.collectCoins` |
| Emergency Fuel | 160 | +50 max boost capacity | Applied via `RunState.applyArtifactBonuses` |

### Rules

- Artifacts cannot stack (1 copy per run)
- Purchased artifacts are removed from shop pool in future visits
- Stored in `RunState.appliedArtifacts: Set<string>`
- Artifact stat bonuses are applied in `RunState.recomputeStats()` after upgrade/evolution bonuses

## RunState Changes

- Added `appliedArtifacts: Set<string>` field
- Added `applyArtifactBonuses()` private method called from `recomputeStats()`

## SceneManager Changes

- Added `data: Record<string, unknown>` bag for cross-scene state sharing

## HUD Changes

- Added artifact count display (`Art: N`) when artifacts are owned
- Game over screen now lists owned artifacts

## File Changes Summary

| File | Change |
|------|--------|
| `src/content/artifacts/artifactTypes.ts` | NEW — ArtifactDef type |
| `src/content/artifacts/artifactDefs.ts` | NEW — 4 artifact definitions |
| `src/app/scene/MerchantScene.ts` | NEW — merchant scene with shop UI, animated gold display, beveled Continue button, reroll button |
| `src/app/scene/SceneManager.ts` | Added `data` bag |
| `src/app/createApp.ts` | Registered `"merchant"` scene |
| `src/sim/runtime/RunState.ts` | Added `appliedArtifacts`, `applyArtifactBonuses()` |
| `src/app/scene/RunScene.ts` | Round clear → merchant flow, artifact effects on scrap/gold, returning state handling |
| `src/content/tuning.ts` | Added `merchant` pricing section |
| `src/ui/Hud.ts` | Added `artifacts` count to HUD display |

## Tuning Values

```typescript
merchant: {
  upgradePriceCommon: 40,
  upgradePriceRare: 60,
  upgradePriceEpic: 80,
}
```

Artifact prices are per-artifact in `artifactDefs.ts`.
