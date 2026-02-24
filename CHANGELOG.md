# Changelog

All notable changes to Sling Survivor are documented here. Version numbers align with project phases (0.1 = Phase 1, etc.) and patch versions for smaller releases.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.6.5] - 2026-02-21

### Changed
- Leaderboard column header "INITIALS" renamed to "WHO".
- Leaderboard header row aligned with data columns (matching padding and text-align for #, WHO, DIST, SCRAP, GOLD, actions).
- Rank column in leaderboard rows centered to align under "#".
- View and Replay buttons in leaderboard kept inline (flex-wrap: nowrap).

---

## [0.6.4] - 2026-02-21

### Changed
- Leaderboard: removed separate "EARNED" column; Gold column now shows total gold earned when available, otherwise current gold.
- View and Replay buttons placed in a single column and forced inline (no vertical stacking).
- h4x0rs no longer shown in a separate bottom block; available as a "Version" dropdown option so flagged cheaters appear in the main list when selected.
- Empty state when "h4x0rs" is selected and no entries: "No flagged entries."

---

## [0.6.3] - 2026-02-21

### Added
- Leaderboard: `cheater` column (boolean, default false) in Supabase schema. Flagged entries are excluded from the normal global leaderboard.
- "h4x0rs" as a version filter option: when selected, main list shows only entries with `cheater = true` (red row styling).
- API: `getGlobalLeaderboardCheaters()`, `getGlobalLeaderboard()` filters to `cheater = false`; version options built from non-cheaters only.

### Documentation
- `docs/LEADERBOARD.md` and `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` updated for cheater flag and h4x0rs.

---

## [0.6.2] - 2026-02-21

### Added
- **Total gold earned:** `RunState.totalGoldEarned` (incremented on coin pickups and round-complete bonus; never reduced by merchant spending). Gold spent = totalGoldEarned − gold.
- Leaderboard and run summary: store and display total gold earned; Gold column shows earned when present for compatibility.
- Replay snapshots and Edge Function verification: `totalGoldEarned` included and validated when submitted.
- Supabase: optional `total_gold_earned` column; initials prompt and summary scene show "Gold" and "Earned" where applicable.

### Changed
- Summary scene: "Gold (end)" and "Gold earned" labels; leaderboard API and submit payload include `totalGoldEarned` / `total_gold_earned`.

### Fixed
- RunScene joystick base circles: added missing radius argument to `circle()` calls (PixiJS expects x, y, radius).

---

## [0.6.1] - 2025

### Added
- Enemy death FX: shatter burst (texture fragments) + boom flash and ring (ExplosionFx, FxManager).
- Touch/drag thrust: full-screen virtual joystick; CombinedThrustInput for keyboard + drag.
- Mobile: virtual joystick widget in bottom-right (display only); touch-action and preventDefault for no scroll/zoom while dragging.
- Coins: 2× size (48px) for DPI; replay scene uses same coin size from tuning.

### Changed
- CollisionSystem returns death events; RunScene spawns death FX before removing drone sprites.
- Thrust input abstracted to IThrustInput; BoostThrustSystem and flame use getAxis() from combined input.

---

## [0.6.0] - 2025

### Added
- Phase 6.0 cosmetic sprite pass: player as rocket sprite, enemies as shared UFO sprite with tint/scale and per-enemy wobble.
- Fallback circle for player if texture missing; collision hitboxes unchanged (visual only).

---

## [0.5.0] - 2025

### Added
- (Phase 5 — leaderboard, replays, and related features; see docs for details.)

---

## [0.4.5] - 2025

### Added
- (Phase 4.5 enhancements; see docs/PHASE4_5_COMPLETE.md.)

---

## [0.4.0] - 2025

### Added
- Merchant scene: post-round shop with gold, 6 shop cards, reroll, artifacts.
- Gold economy: round clear converts excess scrap to gold; rocket bonus; spending at merchant.
- Artifacts and merchant flow between round clear and next launch.

---

## [0.3.6] - 2025

### Added
- Gold from excess scrap on round clear; scrapToGoldRate tuning (e.g. 0.5).

---

## [0.3.5] - 2025

### Added
- (Phase 3.5 content; see docs/PHASE3_5_COMPLETE.md.)

---

## [0.3.0] - 2025

### Added
- Data-driven evolution system: EvolutionDef, evolutionDefs, EvolutionSystem.
- Evolution Auto-Cannon → Rail Cannon (recipe: Double Tap, High Velocity, Armor Piercing).
- Screen shake on evolution; applied evolutions stored in RunState.

---

## [0.2.0] - 2025

### Added
- Deterministic RNG (Mulberry32) and RunState (seed, upgrades, derived stats).
- Data-driven upgrades: upgradeTypes, upgradeDefs, upgradePool (12 upgrades).
- UpgradeSystem: milestones, choice generation, apply logic; derived stats recomputed on apply.
- Upgrade overlay UI (3 cards, keyboard 1/2/3); sim pauses while overlay open.
- Multi-weapon system: Auto-Cannon, Rear Blaster; weapon defs and derived weapon stats.
- Seed override via `?seed=` for reproducible runs.

---

## [0.1.0] - 2025

### Added
- Slingshot launch: pull-back launcher, power from pull distance, rubber-band and direction indicator.
- Boost thrust (WASD/arrows): drain and regen, thrust acceleration, 3-circle flame trail.
- Momentum penalty on hit: velocity reduction, drag debuff, contact damage.
- Stall / run end when speed below threshold for 1.5s.
- Auto-cannon: cooldown, projectiles, enemy damage and death.
- Parallax starfield; ground collision and bounce; frame delta clamping (tab-switch protection).
- Phase 1 playable loop.

---

[0.6.5]: https://github.com/your-org/sling-survivor/compare/v0.6.4...v0.6.5
[0.6.4]: https://github.com/your-org/sling-survivor/compare/v0.6.3...v0.6.4
[0.6.3]: https://github.com/your-org/sling-survivor/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/your-org/sling-survivor/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/your-org/sling-survivor/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/your-org/sling-survivor/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/your-org/sling-survivor/compare/v0.4.5...v0.5.0
[0.4.5]: https://github.com/your-org/sling-survivor/compare/v0.4.0...v0.4.5
[0.4.0]: https://github.com/your-org/sling-survivor/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/your-org/sling-survivor/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/your-org/sling-survivor/compare/v0.3.0...v0.3.5
[0.3.0]: https://github.com/your-org/sling-survivor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/sling-survivor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/sling-survivor/releases/tag/v0.1.0
