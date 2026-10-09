import * as THREE from 'three';
import { Mob, MOB_TYPE } from './Mob.js';
import { MobSpawner } from './MobSpawner.js';
import { VoxelRaycaster } from '../utilities/VoxelRaycaster.js';

/**
 * Master manager for all active entities and creatures in the world.
 * Handles distance-tiered updates, spawning, damage raycasting, mob-to-player attacks,
 * and chunk-aware disposal.
 */
export class EntityManager {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.mobs = [];
    this.spawner = new MobSpawner(world, this);

    // Callbacks
    this.onPlayerAttacked = null; // (damage, mob) => {}
    this.onMobKilled = null; // (mob, drops) => {}
  }

  spawnMob(type, x, y, z, options = {}) {
    const mob = new Mob(this.world, this.scene, type, { ...options, x, y, z });

    // Wire mob attack callback
    mob.onAttackPlayer = (damage) => {
      if (this.onPlayerAttacked) {
        this.onPlayerAttacked(damage, mob);
      }
    };

    this.mobs.push(mob);
    return mob;
  }

  update(delta, playerPos, dayNightCycle) {
    if (!playerPos) return;

    // 1. Spawner Tick
    if (this.spawner && typeof this.spawner.update === 'function') {
      try {
        this.spawner.update(delta, playerPos, dayNightCycle);
      } catch (err) {
        console.error('MobSpawner update error:', err);
      }
    }

    // 2. Entity Simulation & Distance Throttling
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (!mob || !mob.position) {
        this.mobs.splice(i, 1);
        continue;
      }

      // Clean up dead mobs after death animation
      if (mob.isDead && mob.deathTimer > 1.2) {
        const drops = typeof mob.getDrops === 'function' ? mob.getDrops() : [];
        if (this.onMobKilled) {
          this.onMobKilled(mob, drops);
        }
        if (typeof mob.dispose === 'function') mob.dispose();
        this.mobs.splice(i, 1);
        continue;
      }

      // Distance check for despawn / simulation throttle
      const dist = mob.position.distanceTo ? mob.position.distanceTo(playerPos) : Math.hypot(mob.position.x - playerPos.x, mob.position.y - playerPos.y, mob.position.z - playerPos.z);
      mob.distanceToPlayer = dist;

      // Despawn mobs that wander too far (> 60m)
      if (dist > 60.0) {
        if (typeof mob.dispose === 'function') mob.dispose();
        this.mobs.splice(i, 1);
        continue;
      }

      // Tiered update frequency based on distance
      try {
        if (dist <= 24.0) {
          // Full 60Hz update
          mob.update(delta, playerPos);
        } else if (dist <= 48.0) {
          // Medium distance: full update
          mob.update(delta, playerPos);
        } else {
          // Far distance: physics only
          mob.update(delta * 0.5, null);
        }
      } catch (mobErr) {
        console.error('Individual mob update error:', mobErr);
      }
    }
  }

  /**
   * Raycast check against mobs for melee combat
   */
  findMobInRay(origin, direction, maxDistance = 4.0) {
    let closestMob = null;
    let closestDist = maxDistance;

    // Check if a solid voxel is obstructing line of sight
    if (this.world) {
      const blockHit = VoxelRaycaster.raycast(this.world, origin, direction, maxDistance);
      if (blockHit && blockHit.hit) {
        closestDist = blockHit.distance; // Cannot hit through walls
      }
    }

    const ray = new THREE.Ray(origin, direction.clone().normalize());

    for (const mob of this.mobs) {
      if (!mob || mob.isDead) continue;

      const aabb = mob.getAABB ? mob.getAABB() : null;
      if (!aabb) continue;

      const box = new THREE.Box3(
        new THREE.Vector3(aabb.minX, aabb.minY, aabb.minZ),
        new THREE.Vector3(aabb.maxX, aabb.maxY, aabb.maxZ)
      );

      const hitPoint = new THREE.Vector3();
      if (ray.intersectBox(box, hitPoint)) {
        const dist = origin.distanceTo(hitPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closestMob = mob;
        }
      }
    }

    return closestMob;
  }

  getMobCounts() {
    let passive = 0;
    let hostile = 0;
    for (const m of this.mobs) {
      if (m.ai && m.ai.isHostile) hostile++;
      else passive++;
    }
    return { total: this.mobs.length, passive, hostile };
  }

  clear() {
    for (const mob of this.mobs) {
      mob.dispose();
    }
    this.mobs = [];
  }
}
