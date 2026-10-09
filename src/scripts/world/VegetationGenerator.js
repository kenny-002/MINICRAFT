import { BLOCK } from '../blocks/BlockTypes.js';

/**
 * Reusable Procedural Vegetation and Tree Generator for BlockWorld.
 * Creates voxel structures (Oak, Pine, Palm, Cacti, Flowers, Shrubs, Mushrooms).
 */
export class VegetationGenerator {
  /**
   * Generates an Oak-style Tree with leafy spherical canopy.
   * @param {number} x - Base X
   * @param {number} y - Base Y (surface + 1)
   * @param {number} z - Base Z
   * @param {Function} setBlockFn - Callback (gx, gy, gz, blockId)
   */
  static generateOakTree(x, y, z, setBlockFn) {
    const trunkHeight = 4 + Math.floor((Math.sin(x * 7.1 + z * 3.7) * 0.5 + 0.5) * 3); // 4 to 6

    // Trunk
    for (let ty = 0; ty < trunkHeight; ty++) {
      setBlockFn(x, y + ty, z, BLOCK.WOOD);
    }

    // Canopy layers
    const canopyBase = y + trunkHeight - 2;
    for (let dy = 0; dy <= 3; dy++) {
      const radius = dy >= 2 ? 1 : 2;
      const cy = canopyBase + dy;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) {
            // Cut off hard corners for rounded look
            continue;
          }
          if (dx === 0 && dz === 0 && dy < 2) {
            continue; // Trunk is here
          }
          setBlockFn(x + dx, cy, z + dz, BLOCK.LEAVES);
        }
      }
    }
  }

  /**
   * Generates a Boreal Pine / Spruce Tree with tiered conical needle branches.
   */
  static generatePineTree(x, y, z, setBlockFn) {
    const trunkHeight = 6 + Math.floor((Math.sin(x * 5.3 + z * 8.9) * 0.5 + 0.5) * 3); // 6 to 8

    // Tall trunk
    for (let ty = 0; ty < trunkHeight; ty++) {
      setBlockFn(x, y + ty, z, BLOCK.PINE_WOOD);
    }

    // Top needle spire
    setBlockFn(x, y + trunkHeight, z, BLOCK.PINE_LEAVES);
    setBlockFn(x, y + trunkHeight + 1, z, BLOCK.PINE_LEAVES);

    // Tiered conical branches
    const tiers = [
      { yOff: trunkHeight - 1, radius: 1, crossOnly: true },
      { yOff: trunkHeight - 2, radius: 2, crossOnly: false },
      { yOff: trunkHeight - 3, radius: 1, crossOnly: true },
      { yOff: trunkHeight - 4, radius: 2, crossOnly: false },
      { yOff: trunkHeight - 5, radius: 3, crossOnly: false },
    ];

    for (const tier of tiers) {
      const cy = y + tier.yOff;
      const r = tier.radius;

      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dz === 0) continue;

          if (tier.crossOnly && Math.abs(dx) + Math.abs(dz) > r) continue;
          if (r >= 2 && Math.abs(dx) === r && Math.abs(dz) === r) continue;

          setBlockFn(x + dx, cy, z + dz, BLOCK.PINE_LEAVES);
        }
      }
    }
  }

  /**
   * Generates a Desert Oasis / Beach Palm Tree with curved trunk and star fronds.
   */
  static generatePalmTree(x, y, z, setBlockFn) {
    const trunkHeight = 5 + Math.floor((Math.sin(x * 3.1 + z * 9.2) * 0.5 + 0.5) * 2); // 5 to 6
    const slantX = Math.sin(x + z) > 0 ? 1 : 0;
    const slantZ = Math.cos(x * 1.7) > 0 ? 1 : 0;

    let curX = x;
    let curZ = z;

    for (let ty = 0; ty < trunkHeight; ty++) {
      if (ty >= 3) {
        curX += slantX;
        curZ += slantZ;
      }
      setBlockFn(curX, y + ty, curZ, BLOCK.WOOD);
    }

    // Palm crown
    const topY = y + trunkHeight;
    setBlockFn(curX, topY, curZ, BLOCK.LEAVES);

    // Star-like drooping fronds
    const frondOffsets = [
      // Direct cardinal
      [1, 0, 0], [2, -1, 0],
      [-1, 0, 0], [-2, -1, 0],
      [0, 0, 1], [0, -1, 2],
      [0, 0, -1], [0, -1, -2],
      // Diagonal
      [1, 0, 1], [2, -1, 2],
      [-1, 0, 1], [-2, -1, 2],
      [1, 0, -1], [2, -1, -2],
      [-1, 0, -1], [-2, -1, -2],
    ];

    for (const [fdx, fdy, fdz] of frondOffsets) {
      setBlockFn(curX + fdx, topY + fdy, curZ + fdz, BLOCK.LEAVES);
    }
  }

  /**
   * Generates a Desert Saguaro Cactus.
   */
  static generateCactus(x, y, z, setBlockFn) {
    const height = 2 + Math.floor((Math.sin(x * 11.3 + z * 7.9) * 0.5 + 0.5) * 2); // 2 to 3
    for (let dy = 0; dy < height; dy++) {
      setBlockFn(x, y + dy, z, BLOCK.CACTUS);
    }
  }

  /**
   * Generates a leafy ground bush.
   */
  static generateBush(x, y, z, setBlockFn) {
    setBlockFn(x, y, z, BLOCK.LEAVES);
    setBlockFn(x + 1, y, z, BLOCK.LEAVES);
    setBlockFn(x - 1, y, z, BLOCK.LEAVES);
    setBlockFn(x, y, z + 1, BLOCK.LEAVES);
    setBlockFn(x, y, z - 1, BLOCK.LEAVES);
    setBlockFn(x, y + 1, z, BLOCK.LEAVES);
  }
}
