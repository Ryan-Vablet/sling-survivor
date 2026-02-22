# Phase 3.6 — Dual Currency System (Complete)

## Overview

Introduced a dual-currency economy with strict separation:

- **Scrap** = round survival currency (earned from kills, pays round tolls)
- **Gold** = banked reward currency (earned from excess scrap + world coin pickups, reserved for future merchants)
- **XP** = unchanged, upgrades only

These three systems are fully orthogonal and must remain decoupled.

## Scrap System

| Source | Amount |
|--------|--------|
| Enemy kill | 10 scrap |

- Accumulates across rockets within the same round
- Consumed by round toll on round clear
- Excess scrap converts to gold at 50% rate
- Resets to 0 when round clears

## Gold System

| Source | Amount |
|--------|--------|
| Excess scrap on round clear | floor(excess * 0.5) |
| Rocket efficiency bonus | 15 gold per remaining rocket |
| World coin pickup | 5 gold |

- Persists across rounds for the entire run
- NOT spendable yet (reserved for future merchants/shops)

## World Coins

Floating animated coin pickups spawn along the travel path using the `coin_flip_sheet.png` sprite sheet.

| Parameter | Value |
|-----------|-------|
| Spawn interval | 800–1200 px between clusters |
| Cluster size | 3–6 coins |
| Gold per pickup | 5 |
| Pickup radius | 32 px |
| Coin size | 24x24 px |

Coins feature:
- Animated spinning sprite from the existing 8-frame coin sheet
- Idle bob animation (sinusoidal vertical oscillation)
- Spawn ahead of the player using seeded RNG
- Despawn when collected or left far behind

## Round Clear Flow

When scrap >= toll at end of rocket:

```
excessScrap = scrap - toll
goldFromScrap = floor(excessScrap * 0.5)
goldFromRockets = rocketsRemaining * 15
gold += goldFromScrap + goldFromRockets
scrap = 0
round++
rocketsRemaining = 3
toll = round(toll * 1.7)
```

## Tuning Values

```
scrap.perKill             = 10

gold.scrapToGoldRate      = 0.5
gold.rocketBonus          = 15

worldCoins.goldPerPickup  = 5
worldCoins.spawnIntervalMin = 800
worldCoins.spawnIntervalMax = 1200
worldCoins.clusterMin     = 3
worldCoins.clusterMax     = 6
worldCoins.pickupRadius   = 32
worldCoins.coinSize        = 24
```

## HUD Changes

Top-left text now shows:
- Round, Rockets, Gold (banked)
- Scrap/Toll progress, Distance, Speed
- Kills, Hits

## RunState Changes

| Field | Change |
|-------|--------|
| `coins` | Renamed to `scrap` |
| `roundCoinToll` | Renamed to `roundToll` |
| `gold` | New field (persists across rounds) |

## Files Modified

| File | Change |
|------|--------|
| `src/content/tuning.ts` | Added `scrap`, `gold`, `worldCoins` sections; removed `coinPerKill` from `xp` |
| `src/sim/entities.ts` | Added `WorldCoin` entity type |
| `src/sim/runtime/RunState.ts` | Replaced `coins` with `scrap`/`gold`, renamed `roundCoinToll` to `roundToll` |
| `src/app/scene/RunScene.ts` | Added world coin spawning, collection, sprite management; scrap→gold conversion; rocket gold bonus |
| `src/ui/Hud.ts` | Shows scrap/toll and gold separately |

## Acceptance Tests

1. Killing enemies increases scrap (not gold).
2. Scrap persists across rockets in same round.
3. Reaching toll: converts excess scrap to gold, awards rocket bonus gold, resets scrap, advances round.
4. Losing all rockets before toll paid: game over.
5. World coins spawn in clusters along travel path and grant gold on pickup.
6. Gold persists across rounds.
7. XP system unaffected.
8. All coin placement uses seeded RNG (no Math.random).
