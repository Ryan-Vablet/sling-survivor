# Phase 1 Summary (for this scaffold)

Core intent:
- 2D side-on rocket launcher
- Drag-to-aim launch
- Full-direction thrust ONLY while boost meter > 0
- Boost drains while thrusting; regenerates when not thrusting
- Hits apply momentum penalty; run ends on stall (speed < threshold for N seconds)

This scaffold provides:
- Pixi boot + scene system
- Fixed timestep loop
- Input plumbing (drag + WASD)
- Minimal sim objects for player/terrain/enemies/projectiles (stubs)
