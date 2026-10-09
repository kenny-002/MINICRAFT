import { BLOCK } from '../blocks/BlockTypes.js';
import { ITEMS, ItemRegistry } from '../items/ItemTypes.js';

/**
 * Farming and Agricultural System for BlockWorld Version 4.
 * Handles soil tilling, seed planting, staged crop growth, and harvesting.
 */
export class FarmingSystem {
  constructor(world) {
    this.world = world;
    this.crops = new Map(); // key: 'x,y,z' -> { blockId, stage: 1..3, growthTimer: 0, maxStageTime: 12.0 }
  }

  /**
   * Tills dirt/grass into farmland
   */
  tillSoil(x, y, z) {
    const targetBlock = this.world.getBlock(x, y, z);
    if (targetBlock === BLOCK.GRASS || targetBlock === BLOCK.DIRT) {
      this.world.setBlock(x, y, z, BLOCK.TILLED_SOIL);
      return true;
    }
    return false;
  }

  /**
   * Plants seeds onto tilled soil
   */
  plantSeed(soilX, soilY, soilZ, seedItemId) {
    const seedDef = ItemRegistry.get(seedItemId);
    if (!seedDef || !seedDef.cropBlockId) return false;

    const plantY = soilY + 1;
    const blockAtPlant = this.world.getBlock(soilX, plantY, soilZ);

    if (blockAtPlant === BLOCK.AIR) {
      this.world.setBlock(soilX, plantY, soilZ, seedDef.cropBlockId);

      const key = `${soilX},${plantY},${soilZ}`;
      this.crops.set(key, {
        x: soilX,
        y: plantY,
        z: soilZ,
        cropBlockId: seedDef.cropBlockId,
        stage: 1,
        growthTimer: 0,
        maxStageTime: 12.0 + Math.random() * 6.0, // 12-18 seconds per stage
      });
      return true;
    }
    return false;
  }

  update(delta) {
    for (const [key, crop] of this.crops.entries()) {
      // Check if crop block still exists in world
      const currentBlock = this.world.getBlock(crop.x, crop.y, crop.z);
      if (currentBlock !== crop.cropBlockId) {
        this.crops.delete(key);
        continue;
      }

      // Progress growth
      if (crop.stage < 3) {
        crop.growthTimer += delta;
        if (crop.growthTimer >= crop.maxStageTime) {
          crop.growthTimer = 0;
          crop.stage++;
        }
      }
    }
  }

  getCrop(x, y, z) {
    return this.crops.get(`${x},${y},${z}`) || null;
  }

  removeCrop(x, y, z) {
    this.crops.delete(`${x},${y},${z}`);
  }

  saveState() {
    const data = {};
    for (const [k, v] of this.crops.entries()) {
      data[k] = { ...v };
    }
    return data;
  }

  loadState(data) {
    this.crops.clear();
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      this.crops.set(k, { ...v });
    }
  }
}
