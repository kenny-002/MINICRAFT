import * as THREE from 'three';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, CHUNK_MIN_Y, CHUNK_MAX_Y } from '../chunks/Chunk.js';
import { ChunkMeshBuilder } from '../chunks/ChunkMeshBuilder.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import { TextureAtlas } from '../blocks/TextureAtlas.js';
import { BLOCK } from '../blocks/BlockTypes.js';

/**
 * World manager for BlockWorld Version 2.
 * Controls chunks, biomes, dual-material rendering (solid & water), and persistence.
 */
export class World {
  constructor(scene, seed = 'BlockWorld-Seed-1') {
    this.scene = scene;
    this.seed = seed;
    this.terrainGenerator = new TerrainGenerator(seed);
    this.biomeManager = this.terrainGenerator.biomeManager;
    this.textureAtlas = new TextureAtlas();
    this.meshBuilder = new ChunkMeshBuilder(this.textureAtlas);

    // 1. Shared Solid & Plant Chunk Material
    this.chunkMaterial = new THREE.MeshLambertMaterial({
      map: this.textureAtlas.texture,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.FrontSide,
    });

    // 2. Dedicated Water Material (Semi-transparent with subtle animated sheen)
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: this.textureAtlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.chunks = new Map(); // key: 'cx,cz' -> Chunk
    this.modifiedBlocks = {}; // key: 'gx,gy,gz' -> blockId

    this.renderDistance = 4; // Radius in chunks
    this.lastPlayerChunkX = null;
    this.lastPlayerChunkZ = null;

    this.dirtyChunks = new Set();
    this.waterAnimTime = 0;
  }

  static getChunkCoords(gx, gz) {
    const cx = Math.floor(gx / CHUNK_SIZE_X);
    const cz = Math.floor(gz / CHUNK_SIZE_Z);
    return { cx, cz };
  }

  static getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  static getBlockKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(World.getChunkKey(cx, cz)) || null;
  }

  getBlock(x, y, z) {
    if (y < CHUNK_MIN_Y || y >= CHUNK_MAX_Y) return BLOCK.AIR;

    const blockKey = World.getBlockKey(x, y, z);
    if (this.modifiedBlocks[blockKey] !== undefined) {
      return this.modifiedBlocks[blockKey];
    }

    const { cx, cz } = World.getChunkCoords(x, z);
    const chunk = this.getChunk(cx, cz);
    if (chunk && chunk.isGenerated) {
      const lx = ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      const ly = y - CHUNK_MIN_Y;
      return chunk.getLocalBlock(lx, ly, lz);
    }

    return this.terrainGenerator.getBlockAt(x, y, z);
  }

  setBlock(x, y, z, blockId) {
    if (y < CHUNK_MIN_Y || y >= CHUNK_MAX_Y) return false;

    const blockKey = World.getBlockKey(x, y, z);
    this.modifiedBlocks[blockKey] = blockId;

    const { cx, cz } = World.getChunkCoords(x, z);
    const lx = ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    const ly = y - CHUNK_MIN_Y;

    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      chunk.setLocalBlock(lx, ly, lz, blockId);
      this.dirtyChunks.add(chunk);
    }

    // Update neighboring chunk meshes when modifying chunk boundaries
    if (lx === 0) {
      const neighbor = this.getChunk(cx - 1, cz);
      if (neighbor) this.dirtyChunks.add(neighbor);
    } else if (lx === CHUNK_SIZE_X - 1) {
      const neighbor = this.getChunk(cx + 1, cz);
      if (neighbor) this.dirtyChunks.add(neighbor);
    }

    if (lz === 0) {
      const neighbor = this.getChunk(cx, cz - 1);
      if (neighbor) this.dirtyChunks.add(neighbor);
    } else if (lz === CHUNK_SIZE_Z - 1) {
      const neighbor = this.getChunk(cx, cz + 1);
      if (neighbor) this.dirtyChunks.add(neighbor);
    }

    return true;
  }

  /**
   * Initializes initial chunks around spawn position
   */
  initInitialChunks(centerGx = 0, centerGz = 0) {
    const { cx, cz } = World.getChunkCoords(centerGx, centerGz);
    this._loadChunksAround(cx, cz);
    this._rebuildDirtyChunks(999); // Initial synchronous burst
  }

  update(playerPos, delta = 0.016) {
    const { cx, cz } = World.getChunkCoords(playerPos.x, playerPos.z);

    if (cx !== this.lastPlayerChunkX || cz !== this.lastPlayerChunkZ) {
      this.lastPlayerChunkX = cx;
      this.lastPlayerChunkZ = cz;
      this._loadChunksAround(cx, cz);
      this._unloadDistantChunks(cx, cz);
    }

    this._rebuildDirtyChunks(6);

    // Subtle water wave animation
    this.waterAnimTime += delta * 1.5;
  }

  _loadChunksAround(centerCx, centerCz) {
    const r = this.renderDistance;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = World.getChunkKey(cx, cz);

        let chunk = this.chunks.get(key);
        if (!chunk) {
          chunk = new Chunk(cx, cz, this);
          chunk.generate(this.terrainGenerator, this.modifiedBlocks);
          this.chunks.set(key, chunk);
          this.dirtyChunks.add(chunk);
        }
      }
    }
  }

  _unloadDistantChunks(centerCx, centerCz) {
    const maxDist = this.renderDistance + 2;
    for (const [key, chunk] of this.chunks.entries()) {
      const dist = Math.max(Math.abs(chunk.cx - centerCx), Math.abs(chunk.cz - centerCz));
      if (dist > maxDist) {
        if (chunk.solidMesh) {
          this.scene.remove(chunk.solidMesh);
        }
        if (chunk.waterMesh) {
          this.scene.remove(chunk.waterMesh);
        }
        chunk.dispose();
        this.dirtyChunks.delete(chunk);
        this.chunks.delete(key);
      }
    }
  }

  _rebuildDirtyChunks(maxPerFrame = 6) {
    let count = 0;
    for (const chunk of this.dirtyChunks) {
      if (count >= maxPerFrame) break;

      const { solidGeometry, waterGeometry } = this.meshBuilder.buildChunkMesh(chunk, this);

      // Clean up previous meshes
      if (chunk.solidMesh) {
        this.scene.remove(chunk.solidMesh);
      }
      if (chunk.waterMesh) {
        this.scene.remove(chunk.waterMesh);
      }
      chunk.dispose();

      // Create new solid mesh
      if (solidGeometry) {
        const solidMesh = new THREE.Mesh(solidGeometry, this.chunkMaterial);
        solidMesh.castShadow = true;
        solidMesh.receiveShadow = true;
        this.scene.add(solidMesh);
        chunk.solidMesh = solidMesh;
      }

      // Create new water mesh
      if (waterGeometry) {
        const waterMesh = new THREE.Mesh(waterGeometry, this.waterMaterial);
        waterMesh.renderOrder = 1;
        this.scene.add(waterMesh);
        chunk.waterMesh = waterMesh;
      }

      chunk.isDirty = false;
      this.dirtyChunks.delete(chunk);
      count++;
    }
  }

  getLoadedChunkCount() {
    return this.chunks.size;
  }

  getVisibleMeshCount() {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.solidMesh) count++;
      if (chunk.waterMesh) count++;
    }
    return count;
  }

  getTotalTriangleCount() {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.solidMesh && chunk.solidMesh.geometry.index) {
        count += chunk.solidMesh.geometry.index.count / 3;
      }
      if (chunk.waterMesh && chunk.waterMesh.geometry.index) {
        count += chunk.waterMesh.geometry.index.count / 3;
      }
    }
    return count;
  }

  getBiomeInfo(gx, gz) {
    const biome = this.terrainGenerator.biomeManager.getBiome(gx, gz);
    const temp = this.terrainGenerator.biomeManager.getTemperature(gx, gz);
    const humidity = this.terrainGenerator.biomeManager.getHumidity(gx, gz);
    const surfaceY = this.terrainGenerator.getHeight(gx, gz);

    return {
      name: biome.name,
      type: biome.type,
      temperature: temp,
      humidity: humidity,
      surfaceHeight: surfaceY,
    };
  }

  getBiomeAt(gx, gz) {
    if (this.biomeManager && typeof this.biomeManager.getBiome === 'function') {
      return this.biomeManager.getBiome(gx, gz);
    }
    if (this.terrainGenerator?.biomeManager?.getBiome) {
      return this.terrainGenerator.biomeManager.getBiome(gx, gz);
    }
    return { name: 'Verdant Plains', type: 'PLAINS' };
  }

  getHeightAt(gx, gz) {
    if (this.terrainGenerator && typeof this.terrainGenerator.getHeight === 'function') {
      return this.terrainGenerator.getHeight(gx, gz);
    }
    return 10;
  }
}

