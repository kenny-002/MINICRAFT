import { MOB_TYPE } from './Mob.js';
import { BIOME_TYPES } from '../world/BiomeManager.js';

/**
 * Rules-based procedural mob spawner for BlockWorld Version 4.
 */
export class MobSpawner {
  constructor(world, entityManager, options = {}) {
    this.world = world;
    this.entityManager = entityManager;

    this.maxMobs = options.maxMobs || 22;
    this.minSpawnDist = 16.0;
    this.maxSpawnDist = 44.0;
    this.spawnTimer = 0;
    this.spawnInterval = 3.5;
  }

  update(delta, playerPos, dayNightCycle) {
    if (!playerPos || !this.world) return;

    this.spawnTimer += delta;
    if (this.spawnTimer < this.spawnInterval) return;
    this.spawnTimer = 0;

    // Check population cap
    if (this.entityManager.mobs.length >= this.maxMobs) return;

    // Attempt spawn
    this._trySpawn(playerPos, dayNightCycle);
  }

  _trySpawn(playerPos = { x: 0, y: 26, z: 0 }, dayNightCycle = null) {
    if (!playerPos) playerPos = { x: 0, y: 26, z: 0 };
    const angle = Math.random() * Math.PI * 2;
    const dist = this.minSpawnDist + Math.random() * (this.maxSpawnDist - this.minSpawnDist);
    const spawnX = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const spawnZ = Math.floor(playerPos.z + Math.sin(angle) * dist);

    const isNight = dayNightCycle ? dayNightCycle.isNight() : false;
    const isUnderground = (playerPos.y || 26) < 22;

    let selectedType = null;

    if (isUnderground) {
      // Underground / Cave spawning
      selectedType = MOB_TYPE.CAVE_STALKER;
    } else if (isNight) {
      // Nocturnal outdoor spawning
      const r = Math.random();
      if (r < 0.65) {
        selectedType = MOB_TYPE.NIGHT_HOWLER;
      } else {
        selectedType = MOB_TYPE.SKY_BIRD;
      }
    } else {
      // Daytime surface biome-based spawning
      const biome = this.world.biomeManager ? this.world.biomeManager.getBiomeAt(spawnX, spawnZ) : { type: BIOME_TYPES.PLAINS };
      const r = Math.random();

      switch (biome.type) {
        case BIOME_TYPES.FOREST:
          if (r < 0.45) selectedType = MOB_TYPE.FOREST_BOAR;
          else if (r < 0.8) selectedType = MOB_TYPE.MEADOW_DEER;
          else selectedType = MOB_TYPE.SKY_BIRD;
          break;

        case BIOME_TYPES.PLAINS:
          if (r < 0.6) selectedType = MOB_TYPE.MEADOW_DEER;
          else selectedType = MOB_TYPE.SKY_BIRD;
          break;

        case BIOME_TYPES.DESERT:
          if (r < 0.5) selectedType = MOB_TYPE.SKY_BIRD;
          break;

        case BIOME_TYPES.SNOW:
          if (r < 0.5) selectedType = MOB_TYPE.MEADOW_DEER;
          else selectedType = MOB_TYPE.FOREST_BOAR;
          break;

        default:
          selectedType = MOB_TYPE.MEADOW_DEER;
          break;
      }
    }

    if (!selectedType) return;

    // Find safe terrain height
    const surfaceHeight = typeof this.world.getHeightAt === 'function'
      ? this.world.getHeightAt(spawnX, spawnZ)
      : (this.world.terrainGenerator ? this.world.terrainGenerator.getHeight(spawnX, spawnZ) : 10);
    let spawnY = isUnderground ? Math.floor(playerPos.y) : surfaceHeight + 1;

    // For flying bird, offset higher
    if (selectedType === MOB_TYPE.SKY_BIRD) {
      spawnY += 12 + Math.floor(Math.random() * 8);
    }

    // Ensure spawn position is in air block above ground
    const blockAtSpawn = this.world.getBlock(spawnX, spawnY, spawnZ);
    if (blockAtSpawn === 0 || blockAtSpawn === 19) {
      this.entityManager.spawnMob(selectedType, spawnX + 0.5, spawnY, spawnZ + 0.5);
    }
  }
}
