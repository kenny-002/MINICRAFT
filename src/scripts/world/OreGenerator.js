import { SimplexNoise } from '../utilities/SimplexNoise.js';
import { BLOCK } from '../blocks/BlockTypes.js';
import { BIOME_TYPE } from './BiomeManager.js';

/**
 * Helper to compute triangular / linear curve distribution in range [minY, maxY] with peak at peakY.
 * Returns a weight in [0, 1].
 */
function triangleWeight(y, minY, maxY, peakY) {
  if (y < minY || y > maxY) return 0;
  if (y <= peakY) {
    return peakY === minY ? 1 : (y - minY) / (peakY - minY);
  } else {
    return peakY === maxY ? 1 : (maxY - y) / (maxY - peakY);
  }
}

/**
 * Deterministic Ore Vein and Mineral Deposit Generator for MINICRAFT V8.5.
 * Distributes ores underground with realistic, accurate Minecraft target depths across Y = -70 to Y = 80+.
 */
export class OreGenerator {
  constructor(seed = 'BlockWorld-Seed-1') {
    this.seed = seed;
    this.coalNoise = new SimplexNoise(seed + '_ore_coal');
    this.ironNoise = new SimplexNoise(seed + '_ore_iron');
    this.copperNoise = new SimplexNoise(seed + '_ore_copper');
    this.goldNoise = new SimplexNoise(seed + '_ore_gold');
    this.lapisNoise = new SimplexNoise(seed + '_ore_lapis');
    this.redstoneNoise = new SimplexNoise(seed + '_ore_redstone');
    this.crystalNoise = new SimplexNoise(seed + '_ore_crystal');
    this.emeraldNoise = new SimplexNoise(seed + '_ore_emerald');
    this.gravelNoise = new SimplexNoise(seed + '_ore_gravel');
  }

  /**
   * Returns the ore block type at (x, y, z) if an ore vein exists, or null.
   * Host rock awareness: generates deepslate variants if hostRock is Deepslate.
   *
   * @param {number} x Global X coordinate
   * @param {number} y Global Y coordinate (-70..88)
   * @param {number} z Global Z coordinate
   * @param {Object} [biome] Biome object from BiomeManager
   * @param {number} [hostRock=BLOCK.STONE] Host rock block ID (STONE or DEEPSLATE)
   * @returns {number|null} Block ID or null if no ore exists
   */
  getOreAt(x, y, z, biome = null, hostRock = BLOCK.STONE) {
    // Bedrock floor is strictly protected
    if (y <= -69 || y >= 88) return null;

    const isDeepslate = (hostRock === BLOCK.DEEPSLATE || y < -35);
    const biomeType = biome ? biome.type : null;

    // =========================================================================
    // 1. Diamond / Crystal Ore
    // Concentrated deep underground, becoming more common toward Y = -59..-68
    // Range: Y = -70 to -35
    // =========================================================================
    if (y >= -68 && y <= -35) {
      const weight = (-34 - y) / 34; // 1.0 at y=-68, 0.03 at y=-35
      const scale = 0.14;
      const n = this.crystalNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.84 - 0.16 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_CRYSTAL_ORE : BLOCK.CRYSTAL_ORE;
      }
    }

    // =========================================================================
    // 2. Redstone Ore
    // Concentrated in deep layers with strong distribution around Y = -59..-68
    // Range: Y = -70 to -25
    // =========================================================================
    if (y >= -68 && y <= -25) {
      const weight = (-24 - y) / 44; // 1.0 at y=-68, 0.02 at y=-25
      const scale = 0.13;
      const n = this.redstoneNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.80 - 0.16 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_REDSTONE_ORE : BLOCK.REDSTONE_ORE;
      }
    }

    // =========================================================================
    // 3. Emerald Ore
    // Primarily in high-altitude mountain and windswept biomes (Y >= 72, peak Y = 78..86)
    // =========================================================================
    if (biomeType === BIOME_TYPE.SNOW && y >= 72 && y <= 88) {
      const weight = triangleWeight(y, 72, 88, 80);
      const scale = 0.16;
      const n = this.emeraldNoise.noise3D(x * scale, (y - 70) * scale, z * scale);
      const threshold = 0.82 - 0.15 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_EMERALD_ORE : BLOCK.EMERALD_ORE;
      }
    }

    // =========================================================================
    // 4. Lapis Lazuli Ore
    // Favors middle depths around Y = 0 (Range: Y = -25 to 25)
    // =========================================================================
    if (y >= -25 && y <= 25) {
      const weight = triangleWeight(y, -25, 25, 0);
      const scale = 0.14;
      const n = this.lapisNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.80 - 0.15 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_LAPIS_ORE : BLOCK.LAPIS_ORE;
      }
    }

    // =========================================================================
    // 5. Gold Ore
    // Concentrates around Y = -16 (Range: Y = -64 to 15)
    // In Badlands/Desert biomes: extra high-altitude gold generation (Y = 25 to 75)
    // =========================================================================
    let goldWeight = 0;
    if (y >= -64 && y <= 15) {
      goldWeight = triangleWeight(y, -64, 15, -16);
    }
    if (biomeType === BIOME_TYPE.DESERT && y >= 25 && y <= 75) {
      const desertBonus = triangleWeight(y, 25, 75, 50) * 0.9;
      goldWeight = Math.max(goldWeight, desertBonus);
    }
    if (goldWeight > 0) {
      const scale = 0.12;
      const n = this.goldNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.78 - 0.15 * goldWeight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_GOLD_ORE : BLOCK.GOLD_ORE;
      }
    }

    // =========================================================================
    // 6. Copper Ore
    // Favors Y = 48 (Range: Y = 15 to 70)
    // =========================================================================
    if (y >= 15 && y <= 70) {
      const weight = triangleWeight(y, 15, 70, 48);
      const scale = 0.11;
      const n = this.copperNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.73 - 0.17 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_COPPER_ORE : BLOCK.COPPER_ORE;
      }
    }

    // =========================================================================
    // 7. Iron Ore
    // Dual peak: around Y = 16 underground, and around Y = 75+ in mountains
    // =========================================================================
    let ironWeight = 0;
    if (y >= -30 && y <= 56) {
      ironWeight = triangleWeight(y, -30, 56, 16);
    }
    if (y >= 68 && y <= 88) {
      const mountainIron = triangleWeight(y, 68, 88, 78) * 0.85;
      ironWeight = Math.max(ironWeight, mountainIron);
    }
    if (ironWeight > 0) {
      const scale = 0.10;
      const n = this.ironNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.69 - 0.17 * ironWeight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_IRON_ORE : BLOCK.IRON_ORE;
      }
    }

    // =========================================================================
    // 8. Coal Ore
    // Favors Y = 60..78 and higher mountain elevations (Range: Y = 20 to 88)
    // =========================================================================
    if (y >= 20 && y <= 88) {
      const weight = triangleWeight(y, 20, 88, 64);
      const scale = 0.085;
      const n = this.coalNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const threshold = 0.64 - 0.20 * weight;
      if (n > threshold) {
        return isDeepslate ? BLOCK.DEEPSLATE_COAL_ORE : BLOCK.COAL_ORE;
      }
    }

    return null;
  }
}
