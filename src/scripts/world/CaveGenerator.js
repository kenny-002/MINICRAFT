import { SimplexNoise } from '../utilities/SimplexNoise.js';

/**
 * Deterministic 3D Cave Generator.
 * Uses dual-layer 3D simplex noise to carve organic subterranean tunnel systems
 * and expansive cavern chambers beneath the world surface.
 */
export class CaveGenerator {
  constructor(seed = 'BlockWorld-Seed-1') {
    this.seed = seed;
    this.noise3D_1 = new SimplexNoise(seed + '_cave_3d_1');
    this.noise3D_2 = new SimplexNoise(seed + '_cave_3d_2');
    this.noiseChambers = new SimplexNoise(seed + '_cave_chambers');
  }

  /**
   * Determines if a 3D block coordinate should be carved out as a cave.
   * @param {number} x - Global X coordinate
   * @param {number} y - Global Y coordinate
   * @param {number} z - Global Z coordinate
   * @param {number} surfaceY - Surface terrain height at (x, z)
   * @returns {boolean} True if the voxel should be carved into air/cave
   */
  isCave(x, y, z, surfaceY) {
    // 1. Bedrock protection layer (y = -70 and -69)
    if (y <= -69) return false;

    // 2. Caves only exist beneath or at surface boundary
    if (y > surfaceY) return false;

    // Surface buffer protection: keep surface solid except for rare natural cave entrances / ravines
    const depthBelowSurface = surfaceY - y;
    if (depthBelowSurface < 3) {
      // Near surface: only allow rare cave openings (e.g., ravines)
      const entranceNoise = this.noise3D_1.noise3D(x * 0.02, y * 0.02, z * 0.02);
      if (entranceNoise < 0.62) {
        return false;
      }
    }

    // 3. 3D Worm Tunnels (Ridged dual 3D Simplex noise)
    const scale = 0.032;
    const n1 = this.noise3D_1.noise3D(x * scale, (y + 70) * (scale * 1.2), z * scale);
    const n2 = this.noise3D_2.noise3D((x + 234.5) * scale, ((y + 70) + 123.4) * (scale * 1.2), (z + 678.9) * scale);

    // Tunnel condition: intersections where both noise values are close to 0
    const tunnelDensity = n1 * n1 + n2 * n2;
    const tunnelThreshold = 0.026;

    if (tunnelDensity < tunnelThreshold) {
      return true;
    }

    // 4. Large Underground Caverns & Deep Caverns
    if (y < 40 && depthBelowSurface >= 6) {
      const chamberScale = 0.022;
      const chamberNoise = this.noiseChambers.fractal3D(x * chamberScale, (y + 70) * (chamberScale * 1.1), z * chamberScale, 2, 0.5, 2.0);
      
      // Deep cheese cavern threshold
      if (chamberNoise > 0.48) {
        return true;
      }
    }

    return false;
  }
}
