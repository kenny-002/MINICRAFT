import * as THREE from 'three';

let NEXT_ENTITY_ID = 1;

/**
 * Base Entity class for all living creatures and dynamic objects in BlockWorld.
 */
export class Entity {
  constructor(world, type, options = {}) {
    this.id = NEXT_ENTITY_ID++;
    this.world = world;
    this.type = type;

    // Transform
    this.position = new THREE.Vector3(options.x || 0, options.y || 0, options.z || 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, options.yaw || 0, 0, 'YXZ');
    this.yaw = options.yaw || 0;

    // Dimensions (AABB)
    this.width = options.width || 0.8;
    this.height = options.height || 1.2;
    this.depth = options.depth || 0.8;

    // Vitals
    this.maxHealth = options.maxHealth || 20;
    this.health = this.maxHealth;
    this.isDead = false;

    // Physics Flags
    this.isGrounded = false;
    this.isInWater = false;
    this.isFlying = options.isFlying || false;
    this.gravity = options.gravity !== undefined ? options.gravity : 28.0;
    this.drag = 0.88;

    // Visuals & Meshes
    this.mesh = null;
    this.hitFlashTimer = 0;
    this.deathTimer = 0;

    // Distance-based simulation throttle
    this.distanceToPlayer = 0;
  }

  getAABB(offset = this.position) {
    const hw = this.width / 2;
    const hd = this.depth / 2;
    return {
      minX: offset.x - hw,
      minY: offset.y,
      minZ: offset.z - hd,
      maxX: offset.x + hw,
      maxY: offset.y + this.height,
      maxZ: offset.z + hd,
    };
  }

  takeDamage(amount, knockbackVec = null, source = null) {
    if (this.isDead) return false;

    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 0.22;

    if (knockbackVec) {
      this.velocity.x += knockbackVec.x;
      this.velocity.y += Math.max(3.5, knockbackVec.y || 3.5);
      this.velocity.z += knockbackVec.z;
      this.isGrounded = false;
    }

    if (this.health <= 0) {
      this.die(source);
    }

    return true;
  }

  die(source = null) {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 0;
  }

  update(delta) {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
    }

    if (this.isDead) {
      this.deathTimer += delta;
      if (this.mesh) {
        this.mesh.rotation.z = Math.min(Math.PI / 2, this.mesh.rotation.z + delta * 5);
      }
      return;
    }

    // Apply Physics & Movement
    this._updatePhysics(delta);

    // Sync 3D Mesh Transform
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.yaw;
    }
  }

  _updatePhysics(delta) {
    // 1. Apply Gravity if not flying
    if (!this.isFlying) {
      this.velocity.y -= this.gravity * delta;
    }

    // Water check
    const currentBlock = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.3),
      Math.floor(this.position.z)
    );
    this.isInWater = currentBlock === 19; // BLOCK.WATER
    if (this.isInWater && !this.isFlying) {
      this.velocity.y = Math.max(this.velocity.y, -3.0);
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // 2. Voxel Collision Resolution (Separate X, Y, Z axes)
    // Move X
    let dx = this.velocity.x * delta;
    if (dx !== 0) {
      const targetPos = new THREE.Vector3(this.position.x + dx, this.position.y, this.position.z);
      if (this._checkCollision(targetPos)) {
        // Step up logic for small 1-block steps
        if (this.isGrounded && !this._checkCollision(new THREE.Vector3(targetPos.x, targetPos.y + 1.05, targetPos.z))) {
          this.position.y += 1.05;
          this.position.x += dx;
        } else {
          this.velocity.x = 0;
        }
      } else {
        this.position.x += dx;
      }
    }

    // Move Z
    let dz = this.velocity.z * delta;
    if (dz !== 0) {
      const targetPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z + dz);
      if (this._checkCollision(targetPos)) {
        // Step up logic
        if (this.isGrounded && !this._checkCollision(new THREE.Vector3(targetPos.x, targetPos.y + 1.05, targetPos.z))) {
          this.position.y += 1.05;
          this.position.z += dz;
        } else {
          this.velocity.z = 0;
        }
      } else {
        this.position.z += dz;
      }
    }

    // Move Y
    let dy = this.velocity.y * delta;
    this.isGrounded = false;
    if (dy !== 0) {
      const targetPos = new THREE.Vector3(this.position.x, this.position.y + dy, this.position.z);
      if (this._checkCollision(targetPos)) {
        if (dy < 0) {
          // Landed on ground
          this.isGrounded = true;
          this.position.y = Math.floor(targetPos.y + 0.001) + 1.0;
        } else {
          // Hit ceiling
          this.position.y = Math.floor(targetPos.y + this.height) - this.height;
        }
        this.velocity.y = 0;
      } else {
        this.position.y += dy;
      }
    }

    // Drag damping on horizontal velocity
    this.velocity.x *= Math.pow(this.drag, delta * 20);
    this.velocity.z *= Math.pow(this.drag, delta * 20);
  }

  _checkCollision(pos) {
    if (!this.world) return false;

    const aabb = this.getAABB(pos);
    const minBx = Math.floor(aabb.minX);
    const maxBx = Math.floor(aabb.maxX);
    const minBy = Math.floor(aabb.minY);
    const maxBy = Math.floor(aabb.maxY);
    const minBz = Math.floor(aabb.minZ);
    const maxBz = Math.floor(aabb.maxZ);

    for (let x = minBx; x <= maxBx; x++) {
      for (let y = minBy; y <= maxBy; y++) {
        for (let z = minBz; z <= maxBz; z++) {
          const blockId = this.world.getBlock(x, y, z);
          if (blockId > 0 && blockId !== 19 && !this.world.isBlockPassable?.(blockId)) {
            // Non-passable solid block
            return true;
          }
        }
      }
    }
    return false;
  }
}
