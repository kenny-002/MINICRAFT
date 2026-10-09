import { SimplexNoise } from '../utilities/SimplexNoise.js';
import { BLOCK } from '../blocks/BlockTypes.js';

export const BIOME_TYPE = {
  PLAINS: 'PLAINS',
  FOREST: 'FOREST',
  DESERT: 'DESERT',
  SNOW: 'SNOW',
};

export const BIOME_TYPES = BIOME_TYPE;

export const BIOME_PROPERTIES = {
  [BIOME_TYPE.PLAINS]: {
    type: BIOME_TYPE.PLAINS,
    name: 'Verdant Plains',
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 3,
    baseHeight: 22,
    heightScale: 10,
    treeChance: 0.006,
    flowerChance: 0.035,
    grassChance: 0.08,
    treeType: 'oak',
  },
  [BIOME_TYPE.FOREST]: {
    type: BIOME_TYPE.FOREST,
    name: 'Ancient Forest',
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 4,
    baseHeight: 24,
    heightScale: 14,
    treeChance: 0.045,
    flowerChance: 0.04,
    grassChance: 0.06,
    mushroomChance: 0.015,
    treeType: 'mixed', // oak & pine
  },
  [BIOME_TYPE.DESERT]: {
    type: BIOME_TYPE.DESERT,
    name: 'Arid Dunes',
    surfaceBlock: BLOCK.SAND,
    subsurfaceBlock: BLOCK.SANDSTONE,
    subsurfaceDepth: 4,
    baseHeight: 21,
    heightScale: 9,
    treeChance: 0.001, // rare palm near water
    cactusChance: 0.02,
    treeType: 'palm',
  },
  [BIOME_TYPE.SNOW]: {
    type: BIOME_TYPE.SNOW,
    name: 'Boreal Peaks',
    surfaceBlock: BLOCK.SNOW,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 3,
    baseHeight: 28,
    heightScale: 20,
    treeChance: 0.025,
    flowerChance: 0.005,
    treeType: 'pine',
  },
};

/**
 * Deterministic Biome Generator using large-scale temperature & humidity noise fields.
 */
export class BiomeManager {
  constructor(seed = 'BlockWorld-Seed-1') {
    this.seed = seed;
    this.tempNoise = new SimplexNoise(seed + '_temp');
    this.moistureNoise = new SimplexNoise(seed + '_moist');
  }

  /**
   * Returns normalized temperature value between -1.0 and 1.0
   */
  getTemperature(x, z) {
    const scale = 0.0025;
    return this.tempNoise.fractal2D(x * scale, z * scale, 3, 0.5, 2.0);
  }

  /**
   * Returns normalized humidity/moisture value between -1.0 and 1.0
   */
  getHumidity(x, z) {
    const scale = 0.0025;
    return this.moistureNoise.fractal2D((x + 1234.5) * scale, (z + 5678.9) * scale, 3, 0.5, 2.0);
  }

  /**
   * Determines the biome at world coordinate (x, z)
   */
  getBiome(x, z) {
    const temp = this.getTemperature(x, z);
    const humidity = this.getHumidity(x, z);

    if (temp < -0.18) {
      return BIOME_PROPERTIES[BIOME_TYPE.SNOW];
    } else if (temp > 0.15 && humidity < -0.05) {
      return BIOME_PROPERTIES[BIOME_TYPE.DESERT];
    } else if (humidity > 0.08) {
      return BIOME_PROPERTIES[BIOME_TYPE.FOREST];
    } else {
      return BIOME_PROPERTIES[BIOME_TYPE.PLAINS];
    }
  }

  getBiomeAt(x, z) {
    return this.getBiome(x, z);
  }

  /**
   * Samples biome properties with smooth height blending factors
   */
  getBiomeInterpolation(x, z) {
    const primaryBiome = this.getBiome(x, z);
    const temp = this.getTemperature(x, z);
    const humidity = this.getHumidity(x, z);

    return {
      biome: primaryBiome,
      temperature: temp,
      humidity: humidity,
    };
  }
}
