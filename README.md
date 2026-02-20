# Launcher Survivors (Phase 1 Scaffold)

A Vite + TypeScript + PixiJS scaffold with a clean separation between:
- app boot + scene switching
- fixed-timestep sim loop
- rendering layers + camera
- input (drag launch + WASD thrust)
- placeholder systems (player, terrain, enemies, weapon)
- tuning constants

## Requirements
- Node 18+ recommended

## Install
```bash
npm install
```

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Controls (placeholder)
- Drag mouse (launch UI placeholder)
- WASD: thrust while boost > 0 (placeholder logic)
- D: toggle debug overlay (hitboxes/ground curve)

## Asset note
This scaffold does NOT bundle Kenney assets by default. Drop your spritesheet(s) into:
`src/assets/` and wire them in `src/render/assets.ts`.

## Next steps
Open `docs/` for the design docs and fill in:
- launch drag -> actual impulse
- terrain heightmap/hills
- enemy spawns and collision
- auto weapon + projectiles
- HUD + end screen polish
