import { Assets, Texture } from "pixi.js";

/** Resolve asset path with Vite base (e.g. GitHub Pages /sling-survivor/). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return path.startsWith("/") ? base.slice(0, -1) + path : base + path;
}

/** Cached textures (loaded once in loadAssets). */
let rocketTexture: Texture | null = null;
let ufoTexture: Texture | null = null;
const asteroidTextures: (Texture | null)[] = [];

export function getRocketTexture(): Texture | null {
  return rocketTexture;
}

export function getUfoTexture(): Texture | null {
  return ufoTexture;
}

/** Asteroid sprite 1–6. Index 0 = asteroid_1.png. */
export function getAsteroidTexture(index: number): Texture | null {
  const i = Math.max(0, Math.min(5, Math.floor(index) - 1));
  return asteroidTextures[i] ?? null;
}

/**
 * Load and cache game assets. Call once at scene enter.
 * Phase 6.0: player rocket + enemy UFO. Phase 7: asteroids 1–6.
 */
export async function loadAssets(): Promise<void> {
  try {
    rocketTexture = await Assets.load<Texture>(assetUrl("/assets/player_rocket.png"));
  } catch {
    rocketTexture = null;
  }
  try {
    ufoTexture = await Assets.load<Texture>(assetUrl("/assets/enemies/ufo.png"));
  } catch {
    ufoTexture = null;
  }
  for (let i = 1; i <= 6; i++) {
    try {
      asteroidTextures[i - 1] = await Assets.load<Texture>(
        assetUrl(`/assets/enemies/asteroid_${i}.png`)
      );
    } catch {
      asteroidTextures[i - 1] = null;
    }
  }
}
