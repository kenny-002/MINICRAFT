import { BLOCK, BLOCK_PROPERTIES } from '../blocks/BlockTypes.js';

/**
 * Swept AABB Voxel Collision Physics for Player with Water Swimming & Buoyancy.
 */
export class PlayerPhysics {
  constructor(world) {
    this.world = world;

    // Player AABB dimensions
    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.6;

    // Physics parameters
    this.gravity = 26.0;
    this.waterGravity = 4.5;
    this.terminalVelocity = -40.0;
    this.waterTerminalVelocity = -6.0;
    this.jumpForce = 8.8;
    this.swimForce = 5.2;
    this.walkSpeed = 4.3;
    this.sprintSpeed = 7.2;
    this.waterSpeed = 2.8;

    this.isGrounded = false;
    this.isInWater = false;
    this.isSubmerged = false;
  }

  getAABB(pos) {
    const halfW = this.width / 2;
    return {
      minX: pos.x - halfW,
      maxX: pos.x + halfW,
      minY: pos.y,
      maxY: pos.y + this.height,
      minZ: pos.z - halfW,
      maxZ: pos.z + halfW,
    };
  }

  /**
   * Checks if an AABB overlaps any solid block in the voxel world
   */
  isColliding(aabb) {
    const minBx = Math.floor(aabb.minX);
    const maxBx = Math.floor(aabb.maxX);
    const minBy = Math.floor(aabb.minY);
    const maxBy = Math.floor(aabb.maxY);
    const minBz = Math.floor(aabb.minZ);
    const maxBz = Math.floor(aabb.maxZ);

    for (let y = minBy; y <= maxBy; y++) {
      for (let z = minBz; z <= maxBz; z++) {
        for (let x = minBx; x <= maxBx; x++) {
          const block = this.world.getBlock(x, y, z);
          const props = BLOCK_PROPERTIES[block];
          if (block !== BLOCK.AIR && props && props.solid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Checks if player is submerged or intersecting water voxels
   */
  checkWater(pos) {
    const aabb = this.getAABB(pos);
    const minBx = Math.floor(aabb.minX);
    const maxBx = Math.floor(aabb.maxX);
    const minBy = Math.floor(aabb.minY);
    const maxBy = Math.floor(aabb.maxY);
    const minBz = Math.floor(aabb.minZ);
    const maxBz = Math.floor(aabb.maxZ);

    let waterCount = 0;
    for (let y = minBy; y <= maxBy; y++) {
      for (let z = minBz; z <= maxBz; z++) {
        for (let x = minBx; x <= maxBx; x++) {
          const block = this.world.getBlock(x, y, z);
          if (block === BLOCK.WATER) {
            waterCount++;
          }
        }
      }
    }

    this.isInWater = waterCount > 0;
    const eyeY = Math.floor(pos.y + this.eyeHeight);
    const eyeBlock = this.world.getBlock(Math.floor(pos.x), eyeY, Math.floor(pos.z));
    this.isSubmerged = (eyeBlock === BLOCK.WATER);

    return this.isInWater;
  }

  /**
   * Checks if a specific voxel block position collides with the player's body
   */
  isVoxelInsidePlayer(voxelX, voxelY, voxelZ, playerPos) {
    const aabb = this.getAABB(playerPos);
    return (
      aabb.maxX > voxelX && aabb.minX < voxelX + 1 &&
      aabb.maxY > voxelY && aabb.minY < voxelY + 1 &&
      aabb.maxZ > voxelZ && aabb.minZ < voxelZ + 1
    );
  }

  /**
   * Updates position and velocity with gravity, movement vector, and discrete axis collision resolution
   */
  update(playerPos, velocity, inputVector, isSprinting, isJumping, delta) {
    this.checkWater(playerPos);

    // Unstuck recovery check: if player is inside solid blocks (e.g. from spawn, save load, or block placement)
    if (this.isColliding(this.getAABB(playerPos))) {
      let unstuckY = Math.floor(playerPos.y) + 1.0;
      for (let i = 0; i < 8; i++) {
        const testPos = { x: playerPos.x, y: unstuckY, z: playerPos.z };
        if (!this.isColliding(this.getAABB(testPos))) {
          playerPos.y = unstuckY;
          velocity.y = 0;
          break;
        }
        unstuckY += 1.0;
      }
    }

    // 1. Calculate horizontal movement speed
    let speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
    if (this.isInWater) {
      speed = this.waterSpeed;
    }

    const targetVx = inputVector.x * speed;
    const targetVz = inputVector.z * speed;

    // Smooth horizontal acceleration / deceleration
    const accel = this.isInWater ? 8.0 : (this.isGrounded ? 18.0 : 6.0);
    velocity.x += (targetVx - velocity.x) * Math.min(1.0, accel * delta);
    velocity.z += (targetVz - velocity.z) * Math.min(1.0, accel * delta);

    // 2. Apply gravity / buoyancy
    if (this.isInWater) {
      if (isJumping) {
        // Swimming upwards
        velocity.y = this.swimForce;
      } else {
        // Gentle buoyancy sinking
        velocity.y -= this.waterGravity * delta;
        if (velocity.y < this.waterTerminalVelocity) {
          velocity.y = this.waterTerminalVelocity;
        }
      }
    } else {
      velocity.y -= this.gravity * delta;
      if (velocity.y < this.terminalVelocity) {
        velocity.y = this.terminalVelocity;
      }
    }

    // 3. Move along X axis with collision
    const dx = velocity.x * delta;
    if (dx !== 0) {
      const stepX = dx;
      const testPos = { x: playerPos.x + stepX, y: playerPos.y, z: playerPos.z };
      if (!this.isColliding(this.getAABB(testPos))) {
        playerPos.x += stepX;
      } else {
        velocity.x = 0;
      }
    }

    // 4. Move along Z axis with collision
    const dz = velocity.z * delta;
    if (dz !== 0) {
      const stepZ = dz;
      const testPos = { x: playerPos.x, y: playerPos.y, z: playerPos.z + stepZ };
      if (!this.isColliding(this.getAABB(testPos))) {
        playerPos.z += stepZ;
      } else {
        velocity.z = 0;
      }
    }

    // 5. Move along Y axis with collision
    const dy = velocity.y * delta;
    const prevVy = velocity.y;
    this.isGrounded = false;

    if (dy !== 0) {
      const testPos = { x: playerPos.x, y: playerPos.y + dy, z: playerPos.z };
      if (!this.isColliding(this.getAABB(testPos))) {
        playerPos.y += dy;
      } else {
        if (dy < 0) {
          this.isGrounded = true;
          const aabb = this.getAABB(testPos);
          const minBy = Math.floor(aabb.minY);
          playerPos.y = minBy + 1.0;
          
          // Apply fall damage if dropped at high downward speed
          if (this.onLandCallback && !this.isInWater) {
            this.onLandCallback(prevVy);
          }
          velocity.y = 0;
        } else {
          const aabb = this.getAABB(testPos);
          const maxBy = Math.floor(aabb.maxY);
          playerPos.y = maxBy - this.height - 0.001;
          velocity.y = 0;
        }
      }
    }

    // Void fall protection - never drop through bedrock floor at Y=-70
    if (playerPos.y < -70.0) {
      playerPos.y = -69.0;
      velocity.y = 0;
      this.isGrounded = true;
    }

    // Additional ground check (small offset downwards)
    if (!this.isGrounded && !this.isInWater) {
      const groundProbe = { x: playerPos.x, y: playerPos.y - 0.05, z: playerPos.z };
      if (this.isColliding(this.getAABB(groundProbe))) {
        this.isGrounded = true;
      }
    }

    return this.isGrounded;
  }

  jump(velocity) {
    if (this.isInWater) {
      velocity.y = this.swimForce;
      return true;
    }
    if (this.isGrounded) {
      velocity.y = this.jumpForce;
      this.isGrounded = false;
      return true;
    }
    return false;
  }
}

