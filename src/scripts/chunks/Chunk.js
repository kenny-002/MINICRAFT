import { BLOCK } from '../blocks/BlockTypes.js';
import { VegetationGenerator } from '../world/VegetationGenerator.js';

export const CHUNK_SIZE_X = 16;
export const CHUNK_MIN_Y = -70;
export const CHUNK_MAX_Y = 90;
export const CHUNK_SIZE_Y = CHUNK_MAX_Y - CHUNK_MIN_Y; // 160 blocks tall
export const CHUNK_SIZE_Z = 16;

/**
 * Represents a 16x160x16 voxel volume spanning Y = -70 to Y = 89.
 */
export class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;

    // Global origin in world block coordinates
    this.originX = cx * CHUNK_SIZE_X;
    this.originY = CHUNK_MIN_Y;
    this.originZ = cz * CHUNK_SIZE_Z;

    this.voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
    this.solidMesh = null;
    this.waterMesh = null;
    this.isDirty = true;
    this.isGenerated = false;
  }

  static getIndex(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return -1;
    }
    return (ly * CHUNK_SIZE_Z + lz) * CHUNK_SIZE_X + lx;
  }

  getLocalBlock(lx, ly, lz) {
    const idx = Chunk.getIndex(lx, ly, lz);
    if (idx === -1) return BLOCK.AIR;
    return this.voxels[idx];
  }

  setLocalBlock(lx, ly, lz, blockId) {
    const idx = Chunk.getIndex(lx, ly, lz);
    if (idx === -1) return false;
    this.voxels[idx] = blockId;
    this.isDirty = true;
    return true;
  }

  generate(terrainGenerator, modifiedBlocks = null) {
    if (this.isGenerated) return;

    // 1. Generate base terrain, caves, water, and ores across Y = -70 to 89
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const gx = this.originX + lx;
        const gz = this.originZ + lz;

        for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
          const gy = CHUNK_MIN_Y + ly;
          const block = terrainGenerator.getBlockAt(gx, gy, gz);
          const idx = Chunk.getIndex(lx, ly, lz);
          this.voxels[idx] = block;
        }
      }
    }

    // 2. Generate procedural vegetation, trees, and decorations
    const setBlockSafe = (gx, gy, gz, blockId) => {
      const lx = gx - this.originX;
      const lz = gz - this.originZ;
      const ly = gy - CHUNK_MIN_Y;
      if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z && ly >= 0 && ly < CHUNK_SIZE_Y) {
        const idx = Chunk.getIndex(lx, ly, lz);
        if (idx !== -1) {
          const cur = this.voxels[idx];
          if (cur === BLOCK.AIR || (blockId !== BLOCK.AIR && (cur === BLOCK.LEAVES || cur === BLOCK.PINE_LEAVES))) {
            this.voxels[idx] = blockId;
          } else if (blockId === BLOCK.WOOD || blockId === BLOCK.PINE_WOOD || blockId === BLOCK.CACTUS) {
            this.voxels[idx] = blockId;
          }
        }
      }
    };

    // Check features within chunk bounds
    for (let lz = -3; lz < CHUNK_SIZE_Z + 3; lz++) {
      for (let lx = -3; lx < CHUNK_SIZE_X + 3; lx++) {
        const gx = this.originX + lx;
        const gz = this.originZ + lz;
        const surfaceY = terrainGenerator.getHeight(gx, gz);
        const feature = terrainGenerator.getSurfaceFeature(gx, gz, surfaceY);

        if (feature) {
          const baseY = surfaceY + 1;
          if (feature.type === 'tree') {
            if (feature.treeType === 'pine') {
              VegetationGenerator.generatePineTree(gx, baseY, gz, setBlockSafe);
            } else if (feature.treeType === 'palm') {
              VegetationGenerator.generatePalmTree(gx, baseY, gz, setBlockSafe);
            } else {
              VegetationGenerator.generateOakTree(gx, baseY, gz, setBlockSafe);
            }
          } else if (feature.type === 'cactus') {
            VegetationGenerator.generateCactus(gx, baseY, gz, setBlockSafe);
          } else if (feature.type === 'plant') {
            setBlockSafe(gx, baseY, gz, feature.blockId);
          }
        }
      }
    }

    // 3. Apply any saved modifications in this chunk
    if (modifiedBlocks) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
            const gx = this.originX + lx;
            const gy = CHUNK_MIN_Y + ly;
            const gz = this.originZ + lz;
            const key = `${gx},${gy},${gz}`;
            if (modifiedBlocks[key] !== undefined) {
              const idx = Chunk.getIndex(lx, ly, lz);
              this.voxels[idx] = modifiedBlocks[key];
            }
          }
        }
      }
    }

    this.isGenerated = true;
    this.isDirty = true;
  }

  dispose() {
    if (this.solidMesh) {
      if (this.solidMesh.geometry) this.solidMesh.geometry.dispose();
      this.solidMesh = null;
    }
    if (this.waterMesh) {
      if (this.waterMesh.geometry) this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
  }
}
