/**
 * Simple 1D ground height function in world space (px).
 * Replace with a heightmap later.
 */
export class Terrain {
  groundYAt(x: number): number {
    // gentle hills
    return 420 + Math.sin(x * 0.003) * 30 + Math.sin(x * 0.0012) * 18;
  }
}
