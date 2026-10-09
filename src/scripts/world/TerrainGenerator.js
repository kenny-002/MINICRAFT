import { SimplexNoise } from '../utilities/SimplexNoise.js';
import { BLOCK } from '../blocks/BlockTypes.js';
import { BiomeManager, BIOME_TYPE } from './BiomeManager.js';
import { CaveGenerator } from './CaveGenerator.js';
import { OreGenerator } from './OreGenerator.js';

/**
 * Deterministic Procedural Terrain Generator for MINICRAFT V8.5.
 * Generates genuine 9-layer geological stratification from Y = -70 to Y = 80+.
 */
export class TerrainGenerator {
  constructor(seed = 'BlockWorld-Seed-1') {
    this.seed = seed;
    this.biomeManager = new BiomeManager(seed);
    this.caveGenerator = new CaveGenerator(seed);
    this.oreGenerator = new OreGenerator(seed);

    this.continentNoise = new SimplexNoise(seed + '_continent');
    this.mountainNoise = new SimplexNoise(seed + '_mountain');
    this.detailNoise = new SimplexNoise(seed + '_detail');
    this.riverNoise = new SimplexNoise(seed + '_river');

    // Geological rock pocket noise generators
    this.graniteNoise = new SimplexNoise(seed + '_rock_granite');
    this.dioriteNoise = new SimplexNoise(seed + '_rock_diorite');
    this.andesiteNoise = new SimplexNoise(seed + '_rock_andesite');
    this.tuffNoise = new SimplexNoise(seed + '_rock_tuff');
    this.deeprockNoise = new SimplexNoise(seed + '_rock_deepslate');
    this.soilTransitionNoise = new SimplexNoise(seed + '_soil_transition');
    this.gravelSoilNoise = new SimplexNoise(seed + '_gravel_soil');

    this.seaLevel = 70;
    this.baseHeight = 77;
  }

  /**
   * Calculates surface terrain height at global block coordinate (x, z)
   * Elevation ranges naturally around Y = 68 to 86.
   */
  getHeight(x, z) {
    const { biome } = this.biomeManager.getBiomeInterpolation(x, z);

    // 1. Continental landmass elevation
    const contScale = 0.007;
    const cont = this.continentNoise.fractal2D(x * contScale, z * contScale, 3, 0.55, 2.0);

    // 2. High-frequency detail
    const detailScale = 0.035;
    const detail = this.detailNoise.noise2D(x * detailScale, z * detailScale) * 2.5;

    // 3. Base elevation
    let elevation = this.baseHeight + cont * (biome.heightScale * 0.4) + detail;

    if (biome.type === BIOME_TYPE.SNOW) {
      // Mountain ridges & peaks
      const mScale = 0.012;
      const mNoise = Math.abs(this.mountainNoise.fractal2D(x * mScale, z * mScale, 4, 0.5, 2.1));
      const ridge = Math.pow(mNoise, 1.3) * 7.5;
      elevation += ridge;
    } else if (biome.type === BIOME_TYPE.DESERT) {
      const duneScale = 0.02;
      const dunes = Math.sin(x * duneScale + Math.cos(z * duneScale) * 1.5) * 2.2;
      elevation += dunes;
    } else if (biome.type === BIOME_TYPE.FOREST) {
      const hScale = 0.018;
      const hills = Math.sin(x * hScale) * Math.cos(z * hScale) * 2.5;
      elevation += hills;
    }

    // 4. River / Valley carving
    const rScale = 0.009;
    const rNoise = Math.abs(this.riverNoise.noise2D(x * rScale + 500, z * rScale + 500));
    if (rNoise < 0.08) {
      const riverDepth = (1.0 - (rNoise / 0.08)) * 4.0;
      elevation -= riverDepth;
    }

    const finalHeight = Math.floor(elevation);
    return Math.max(66, Math.min(88, finalHeight));
  }

  /**
   * Returns the exact block type at global 3D voxel coordinate (x, y, z)
   * Strictly implementing the 9 distinct geological layers:
   *  1. Y = 80 to 75: Surface and Topsoil
   *  2. Y = 74 to 65: Deep Soil and Gravel
   *  3. Y = 64 to 40: Upper Stone
   *  4. Y = 39 to 15: Middle Stone (Granite, Diorite, Andesite)
   *  5. Y = 14 to -15: Lower Stone (Tuff)
   *  6. Y = -16 to -35: Deep-Rock Transition (Stone to Deepslate)
   *  7. Y = -36 to -55: Deep Underground (Deepslate, Diamonds, Redstone)
   *  8. Y = -56 to -69: Ancient Lower Rock (Deepslate)
   *  9. Y = -70: Bedrock Floor
   */
  getBlockAt(x, y, z) {
    // 0. Boundary checks
    if (y < -70 || y >= 90) return BLOCK.AIR;

    // =========================================================================
    // LAYER 9: Y = -70 — Continuous Unbreakable Bedrock Floor
    // =========================================================================
    if (y === -70) return BLOCK.BEDROCK;

    // Jagged bedrock transition at Y = -69
    if (y === -69) {
      const bNoise = this.detailNoise.noise2D(x * 0.25 + 100, z * 0.25 + 100);
      if (bNoise > 0.0) {
        return BLOCK.BEDROCK;
      }
    }

    const surfaceY = this.getHeight(x, z);
    const biome = this.biomeManager.getBiome(x, z);

    // Above surface level (Air, Water, Ice)
    if (y > surfaceY) {
      if (y <= this.seaLevel) {
        if (y === this.seaLevel && biome.type === BIOME_TYPE.SNOW) {
          return BLOCK.ICE;
        }
        return BLOCK.WATER;
      }
      return BLOCK.AIR;
    }

    // 3D Cave Carving (caves never carve bedrock at Y <= -69)
    if (this.caveGenerator.isCave(x, y, z, surfaceY)) {
      if (y <= this.seaLevel && y >= 64) {
        return BLOCK.WATER;
      }
      return BLOCK.AIR;
    }

    // =========================================================================
    // LAYER 1: Y = 80 to 75 — Surface and Topsoil
    // Grass, biome-specific surface blocks, and topsoil dirt
    // =========================================================================
    if (y === surfaceY) {
      if (surfaceY <= this.seaLevel + 1) {
        return BLOCK.SAND; // Coastal beach / seabed
      }
      return biome.surfaceBlock;
    }

    const depth = surfaceY - y;

    // Topsoil sub-surface
    if (y >= 75 && depth <= biome.subsurfaceDepth) {
      if (surfaceY <= this.seaLevel + 1) {
        return BLOCK.SANDSTONE;
      }
      return biome.subsurfaceBlock;
    }

    // =========================================================================
    // LAYER 2: Y = 74 to 65 — Deep Soil and Gravel
    // Primarily dirt with gravel pockets, transitioning toward stone
    // =========================================================================
    if (y >= 65 && y <= 74) {
      // Gravel pocket check
      const gNoise = this.gravelSoilNoise.noise3D(x * 0.09, (y + 70) * 0.09, z * 0.09);
      if (gNoise > 0.54) {
        return BLOCK.GRAVEL;
      }

      // Gradual transition toward stone near lower boundary (Y = 65..68)
      const transNoise = this.soilTransitionNoise.noise3D(x * 0.08, (y + 70) * 0.08, z * 0.08);
      const stoneProbability = (74 - y) / 10.0; // 0.0 at 74, 0.9 at 65
      if (transNoise + 0.5 < stoneProbability * 0.8) {
        const ore = this.oreGenerator.getOreAt(x, y, z, biome, BLOCK.STONE);
        return ore !== null ? ore : BLOCK.STONE;
      }

      return BLOCK.DIRT;
    }

    // Determine host rock based on geological depth
    let hostRock = BLOCK.STONE;

    if (y >= 40 && y <= 64) {
      // =======================================================================
      // LAYER 3: Y = 64 to 40 — Upper Stone
      // Mostly stone with coal, iron, and copper ore veins
      // =======================================================================
      hostRock = BLOCK.STONE;
    } else if (y >= 15 && y <= 39) {
      // =======================================================================
      // LAYER 4: Y = 39 to 15 — Middle Stone
      // Mostly stone with natural granite, diorite, and andesite pockets
      // =======================================================================
      const scale = 0.075;
      const gN = this.graniteNoise.noise3D(x * scale, (y + 70) * scale, z * scale);
      const dN = this.dioriteNoise.noise3D((x + 100) * scale, (y + 70) * scale, (z + 100) * scale);
      const aN = this.andesiteNoise.noise3D((x + 200) * scale, (y + 70) * scale, (z + 200) * scale);

      if (gN > 0.56) {
        hostRock = BLOCK.GRANITE;
      } else if (dN > 0.56) {
        hostRock = BLOCK.DIORITE;
      } else if (aN > 0.56) {
        hostRock = BLOCK.ANDESITE;
      } else {
        hostRock = BLOCK.STONE;
      }
    } else if (y >= -15 && y <= 14) {
      // =======================================================================
      // LAYER 5: Y = 14 to -15 — Lower Stone
      // Rugged stone formations with occasional tuff pockets
      // =======================================================================
      const tN = this.tuffNoise.noise3D(x * 0.07, (y + 70) * 0.07, z * 0.07);
      if (tN > 0.58) {
        hostRock = BLOCK.TUFF;
      } else {
        hostRock = BLOCK.STONE;
      }
    } else if (y >= -35 && y <= -16) {
      // =======================================================================
      // LAYER 6: Y = -16 to -35 — Deep-Rock Transition
      // Gradual undulating transition mixing stone and deepslate
      // =======================================================================
      const transScale = 0.06;
      const drN = this.deeprockNoise.noise3D(x * transScale, (y + 70) * (transScale * 1.5), z * transScale);
      const deepslateBias = (-16 - y) / 19.0; // 0.0 at -16, 1.0 at -35
      if (drN + 0.5 < deepslateBias * 1.1) {
        hostRock = BLOCK.DEEPSLATE;
      } else {
        hostRock = BLOCK.STONE;
      }
    } else if (y >= -55 && y <= -36) {
      // =======================================================================
      // LAYER 7: Y = -36 to -55 — Deep Underground
      // Primarily deepslate with rich diamond and redstone veins
      // =======================================================================
      hostRock = BLOCK.DEEPSLATE;
    } else if (y >= -69 && y <= -56) {
      // =======================================================================
      // LAYER 8: Y = -56 to -69 — Ancient Lower Rock
      // Dark deep rock (deepslate) and ancient deep mineral veins
      // =======================================================================
      hostRock = BLOCK.DEEPSLATE;
    }

    // Ore vein generation embedded inside host rock
    const ore = this.oreGenerator.getOreAt(x, y, z, biome, hostRock);
    if (ore !== null) {
      return ore;
    }

    return hostRock;
  }

  /**
   * Samples deterministic surface decoration feature at (x, z)
   */
  getSurfaceFeature(x, z, surfaceY) {
    if (surfaceY <= this.seaLevel) return null; // No vegetation under water
    if (surfaceY >= 86) return null; // No vegetation at high snowy peaks

    const biome = this.biomeManager.getBiome(x, z);

    const hash = (Math.sin(x * 374761393 + z * 668265263 + 9973) * 43758.5453) % 1;
    const posHash = Math.abs(hash);

    // Tree generation check
    if (posHash < biome.treeChance) {
      let treeType = biome.treeType;
      if (treeType === 'mixed') {
        treeType = (Math.sin(x * 13.7 + z * 19.3) > 0) ? 'oak' : 'pine';
      }
      return { type: 'tree', treeType };
    }

    // Cactus in desert
    if (biome.type === BIOME_TYPE.DESERT && biome.cactusChance) {
      if (posHash >= 0.1 && posHash < 0.1 + biome.cactusChance) {
        return { type: 'cactus' };
      }
    }

    // Flowers & Grass & Bushes
    if (biome.flowerChance && posHash >= 0.2 && posHash < 0.2 + biome.flowerChance) {
      const isRed = Math.sin(x * 7.7 + z * 3.3) > 0;
      return { type: 'plant', blockId: isRed ? BLOCK.FLOWER_RED : BLOCK.FLOWER_YELLOW };
    }

    if (biome.grassChance && posHash >= 0.3 && posHash < 0.3 + biome.grassChance) {
      return { type: 'plant', blockId: BLOCK.GRASS_PLANT };
    }

    if (biome.mushroomChance && posHash >= 0.4 && posHash < 0.4 + biome.mushroomChance) {
      return { type: 'plant', blockId: BLOCK.MUSHROOM };
    }

    return null;
  }
}
