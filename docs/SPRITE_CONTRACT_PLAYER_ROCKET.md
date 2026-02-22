# Sprite Contract: Player Rocket

Design specification for replacing the placeholder player circle with a proper rocket sprite. This document covers the current rendering audit, recommended approach, and exact asset requirements.

---

## 1. Current Rendering Audit

### Player Body

The player is currently drawn as a filled circle in `src/app/scene/RunScene.ts`:

```ts
this.gfxWorld
  .circle(this.player.pos.x, this.player.pos.y, this.player.radius)
  .fill({ color: 0x66aaff, alpha: 0.95 });
```

- Shape: circle
- Color: `0x66aaff` (blue)
- Radius: 18px (from `TUNING.player.radius`)
- No rotation applied
- No facing direction stored on the entity

### Thrust Flame

Drawn in `RunScene.drawThrustFlame()` as 3 jittered circles positioned **opposite to the keyboard input axis**:

```ts
const axis = this.kb.getAxis();           // WASD / arrow keys
const thrusting = (axis.x !== 0 || axis.y !== 0) && this.player.boost > 0;
if (!thrusting) return;

const len = Math.hypot(axis.x, axis.y);
const fx = -axis.x / len;                // opposite to input
const fy = -axis.y / len;
```

Three circles at increasing offsets from player center:

| Offset from center | Radius | Color      | Alpha |
|---------------------|--------|------------|-------|
| `r + 6` (24px)      | 8px    | `0xff6600` | 0.8   |
| `r + 15` (33px)     | 5px    | `0xffaa00` | 0.6   |
| `r + 22` (40px)     | 3px    | `0xffdd44` | 0.4   |

Each circle has random jitter of +/-2px (scaling with distance). The flame is only visible when `player.launched && player.boost > 0 && input active`.

**Critical detail**: flame direction is based on **keyboard input axis**, NOT velocity. The flame points opposite to where the player is thrusting, independent of which way the rocket is traveling.

### Physics / Movement

From `src/sim/world/PhysicsWorld.ts` and `src/sim/systems/BoostThrustSystem.ts`:

- Velocity-based movement with gravity (`900 px/s^2` downward)
- Air drag (`0.02` proportional)
- Ground collision with bounce (`0.15`) and friction (`0.12`)
- Launch sets initial velocity via slingshot (generally rightward + upward)
- Thrust adds acceleration in the WASD input direction
- No rotation or facing state exists on the `Player` entity type

---

## 2. Audit Answers

### Q1: What orientation does the rocket expect?

**Default facing RIGHT (0 radians).** The game is side-scrolling; the slingshot launches the rocket rightward. The sprite art should depict the rocket pointing right. The nose should be on the right edge, the engine bell on the left edge.

### Q2: Is rotation applied at runtime or baked into the sprite?

**Applied at runtime.** No rotation exists in the current code (it's a circle). When the sprite is added, rotation will be set each frame via:

```ts
sprite.rotation = Math.atan2(player.vel.y, player.vel.x);
```

This makes the rocket visually face its direction of travel. The sprite asset must be drawn pointing right (0 radians) so `atan2` works correctly with PixiJS's rotation system (0 = right, positive = clockwise).

### Q3: Ideal sprite size in pixels?

**64 x 32 pixels** (2:1 aspect ratio, wider than tall).

- Current collision radius: 18px (36px diameter circle)
- A 64x32 rocket reads clearly as a rocket shape while keeping the 18px collision circle centered and slightly smaller than the visual (standard practice)
- At 2x scale this would be 128x64 for retina — but the game currently renders at 1x, so 64x32 is correct

### Q4: Single sprite, layered, or sprite sheet?

**Single flat sprite for the body.** Reasoning:

- The rocket body has no animation states (it doesn't change shape during idle vs. thrust)
- Rotation is handled by PixiJS at runtime
- The flame is directionally independent from the rocket facing (see Q6) and must remain separate
- A sprite sheet would add complexity with no visual payoff for the body

### Q5: How is boost/thrust currently represented visually?

Three procedural circles drawn opposite to input direction with random jitter (see audit above). Only visible when all conditions are met: `launched`, `boost > 0`, and keyboard input is active. When boost is empty or no keys are pressed, no flame is shown.

### Q6: Is exhaust/fire better as part of the sprite, separate sprite, or particles?

**Separate from the rocket sprite, kept as procedural Graphics.**

The flame direction is determined by `kb.getAxis()` (keyboard input), NOT by `player.vel` (velocity). This means the flame can point in a completely different direction than the rocket is facing. For example, the rocket may be traveling right while the player thrusts upward — the flame should point down, not left.

If the flame were baked into the rocket sprite, it would rotate with the rocket body, which is wrong. Keeping it as separate procedural graphics (the current approach) or as a separate child sprite positioned independently is required.

**Recommendation**: keep the existing procedural flame. It already looks good with the jitter effect. Optionally, add a subtle static glow sprite behind the rocket during thrust for extra juice.

### Q7: Recommended approach?

**Option A: One rocket sprite + separate procedural flame.**

This integrates cleanest because:

1. **Minimal code change**: replace the single `gfxWorld.circle()` call with a pre-loaded `Sprite`, set its `.rotation` each frame
2. **Flame stays independent**: the existing `drawThrustFlame()` continues to work unchanged — it already uses world coordinates and input direction
3. **No animation complexity**: no sprite sheet parsing, no frame management, no timing
4. **Future-proof**: if a sprite sheet is wanted later (damage states, shield overlay), a single sprite can be swapped for an `AnimatedSprite` without architectural changes

---

## 3. Recommended Asset List

### Required

#### `player_rocket.png`

| Property | Value |
|----------|-------|
| Dimensions | 64 x 32 px |
| Pivot / Anchor | Center (0.5, 0.5) — pixel (32, 16) |
| Orientation | Facing RIGHT (nose on right edge, engine bell on left) |
| Background | Fully transparent (PNG alpha) |
| Style | Sci-fi rocket / shuttle silhouette, blue-ish tones to match `0x66aaff` theme |
| Detail | Should read clearly at 1x scale against dark backgrounds (space/ground) |

### Optional

#### `player_glow.png`

| Property | Value |
|----------|-------|
| Dimensions | 48 x 48 px |
| Pivot / Anchor | Center (0.5, 0.5) — pixel (24, 24) |
| Orientation | N/A (radial glow, rotationally symmetric) |
| Background | Fully transparent |
| Style | Soft radial glow, warm orange/yellow tones |
| Usage | Shown behind rocket during thrust, adds visual weight to the procedural flame |
| Animation | None (static image, toggled visible/hidden by thrust state) |

### NOT Needed

- **Flame sprite**: flame remains procedural (3 jittered circles)
- **Sprite sheet**: body has no animation frames
- **Damage / shield overlays**: out of scope for this phase

---

## 4. Integration Notes

### Sprite Setup (in `RunScene.enter()`)

```ts
const rocketTex = await Assets.load<Texture>("/player_rocket.png");
this.rocketSprite = new Sprite(rocketTex);
this.rocketSprite.anchor.set(0.5);
this.layers.world.addChild(this.rocketSprite);
```

### Per-Frame Update (in `RunScene.update()` or `drawWorld()`)

Replace the circle draw:

```ts
// BEFORE:
this.gfxWorld
  .circle(this.player.pos.x, this.player.pos.y, this.player.radius)
  .fill({ color: 0x66aaff, alpha: 0.95 });

// AFTER:
this.rocketSprite.x = this.player.pos.x;
this.rocketSprite.y = this.player.pos.y;
this.rocketSprite.rotation = Math.atan2(this.player.vel.y, this.player.vel.x);
```

### Collision Unchanged

The `player.radius` (18px) continues to be used for all collision checks. The sprite is purely visual. No physics changes needed.

### Flame Unchanged

`drawThrustFlame()` requires no changes. It already positions flames relative to `player.pos` in world coordinates and uses `kb.getAxis()` for direction. It will naturally appear behind/around the rocket sprite.

### Pre-Launch State

Before launch (`player.launched === false`), velocity is `(0, 0)`. `atan2(0, 0)` returns `0` (facing right), which is the correct resting orientation on the launcher pad.

### Z-Order

The rocket sprite should be added to `layers.world` and rendered AFTER the ground but BEFORE the debug overlay. The procedural flame should draw BEFORE the rocket sprite so flames appear behind the body.

---

## 5. Summary

| Decision | Choice |
|----------|--------|
| Default orientation | Facing right (0 rad) |
| Rotation | Runtime, `atan2(vel.y, vel.x)` |
| Sprite size | 64 x 32 px |
| Structure | Single body sprite + procedural flame |
| Flame approach | Keep existing procedural Graphics |
| Assets needed | `player_rocket.png` (required), `player_glow.png` (optional) |
| Code impact | ~10 lines changed in RunScene |
