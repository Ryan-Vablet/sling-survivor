import { Assets, Texture } from "pixi.js";

/** Cached textures (loaded once in loadAssets). */
let rocketTexture: Texture | null = null;
let ufoTexture: Texture | null = null;

export function getRocketTexture(): Texture | null {
  return rocketTexture;
}

export function getUfoTexture(): Texture | null {
  return ufoTexture;
}

/**
 * Load and cache game assets. Call once at scene enter.
 * Phase 6.0: player rocket + enemy UFO sprites.
 */
export async function loadAssets(): Promise<void> {
  try {
    rocketTexture = await Assets.load<Texture>("/assets/player_rocket.png");
  } catch {
    rocketTexture = null;
  }
  try {
    ufoTexture = await Assets.load<Texture>("/assets/enemies/ufo.png");
  } catch {
    ufoTexture = null;
  }
}
