import * as THREE from 'three';

export const AI_STATE = {
  IDLE: 'idle',
  WANDER: 'wander',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  ATTACK: 'attack',
  FLEE: 'flee',
  DEAD: 'dead',
};

/**
 * Lightweight, voxel-aware AI State Machine for BlockWorld creatures.
 */
export class MobAI {
  constructor(mob, options = {}) {
    this.mob = mob;
    this.state = AI_STATE.IDLE;
    this.stateTimer = 1.0 + Math.random() * 2.0;

    // Behavioral Traits
    this.isHostile = options.isHostile || false;
    this.isNeutral = options.isNeutral || false; // Defends when hit
    this.isFlying = options.isFlying || false;
    this.detectionRadius = options.detectionRadius || 18.0;
    this.attackRange = options.attackRange || 2.0;
    this.attackCooldown = options.attackCooldown || 1.4;
    this.attackTimer = 0;
    this.attackDamage = options.attackDamage || 10;

    // Movement Speeds
    this.wanderSpeed = options.wanderSpeed || 2.2;
    this.chaseSpeed = options.chaseSpeed || 4.8;
    this.fleeSpeed = options.fleeSpeed || 5.5;

    // Target Navigation
    this.targetPos = new THREE.Vector3();
    this.hasTarget = false;
    this.stuckTimer = 0;
    this.lastPos = new THREE.Vector3();
  }

  update(delta, playerPos) {
    if (this.mob.isDead) {
      this.state = AI_STATE.DEAD;
      return;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
    }

    this.stateTimer -= delta;

    // Calculate distance to player
    const distToPlayer = playerPos ? this.mob.position.distanceTo(playerPos) : 999;
    this.mob.distanceToPlayer = distToPlayer;

    // Check stuck state
    if (this.mob.position.distanceToSquared(this.lastPos) < 0.001 && this.mob.isGrounded) {
      this.stuckTimer += delta;
      if (this.stuckTimer > 1.2) {
        // Jump or pick new heading
        this.mob.velocity.y = 7.0;
        this.mob.yaw += (Math.random() - 0.5) * Math.PI;
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastPos.copy(this.mob.position);

    // State Execution
    switch (this.state) {
      case AI_STATE.IDLE:
        this._updateIdle(delta, distToPlayer, playerPos);
        break;
      case AI_STATE.WANDER:
        this._updateWander(delta, distToPlayer, playerPos);
        break;
      case AI_STATE.CHASE:
        this._updateChase(delta, distToPlayer, playerPos);
        break;
      case AI_STATE.ATTACK:
        this._updateAttack(delta, distToPlayer, playerPos);
        break;
      case AI_STATE.FLEE:
        this._updateFlee(delta, distToPlayer, playerPos);
        break;
    }
  }

  _updateIdle(delta, distToPlayer, playerPos) {
    this.mob.velocity.x *= 0.5;
    this.mob.velocity.z *= 0.5;

    // Hostile aggro check
    if (this.isHostile && distToPlayer <= this.detectionRadius) {
      this.state = AI_STATE.CHASE;
      return;
    }

    // Passive flight check
    if (!this.isHostile && !this.isNeutral && distToPlayer <= 5.0) {
      this.state = AI_STATE.FLEE;
      this.stateTimer = 4.0;
      return;
    }

    if (this.stateTimer <= 0) {
      this.state = AI_STATE.WANDER;
      this.stateTimer = 3.0 + Math.random() * 4.0;
      this._pickRandomTarget();
    }
  }

  _updateWander(delta, distToPlayer, playerPos) {
    if (this.isHostile && distToPlayer <= this.detectionRadius) {
      this.state = AI_STATE.CHASE;
      return;
    }

    if (!this.isHostile && !this.isNeutral && distToPlayer <= 5.0) {
      this.state = AI_STATE.FLEE;
      this.stateTimer = 4.0;
      return;
    }

    if (this.stateTimer <= 0 || !this.hasTarget) {
      this.state = AI_STATE.IDLE;
      this.stateTimer = 2.0 + Math.random() * 3.0;
      return;
    }

    this._moveToward(this.targetPos, this.wanderSpeed, delta);
  }

  _updateChase(delta, distToPlayer, playerPos) {
    if (!playerPos || distToPlayer > this.detectionRadius * 1.5) {
      this.state = AI_STATE.IDLE;
      this.stateTimer = 2.0;
      return;
    }

    if (distToPlayer <= this.attackRange) {
      this.state = AI_STATE.ATTACK;
      return;
    }

    this._moveToward(playerPos, this.chaseSpeed, delta);
  }

  _updateAttack(delta, distToPlayer, playerPos) {
    if (distToPlayer > this.attackRange * 1.4) {
      this.state = AI_STATE.CHASE;
      return;
    }

    // Look at player
    if (playerPos) {
      const dx = playerPos.x - this.mob.position.x;
      const dz = playerPos.z - this.mob.position.z;
      this.mob.yaw = Math.atan2(dx, dz);
    }

    // Attack strike
    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackCooldown;
      // Trigger attack event on mob
      if (this.mob.onAttackPlayer) {
        this.mob.onAttackPlayer(this.attackDamage);
      }
    }
  }

  _updateFlee(delta, distToPlayer, playerPos) {
    if (this.stateTimer <= 0 && distToPlayer > 14.0) {
      this.state = AI_STATE.IDLE;
      this.stateTimer = 2.0;
      return;
    }

    if (playerPos) {
      // Run away in opposite direction of player
      const dirX = this.mob.position.x - playerPos.x;
      const dirZ = this.mob.position.z - playerPos.z;
      const fleeTarget = new THREE.Vector3(
        this.mob.position.x + dirX * 3.0,
        this.mob.position.y,
        this.mob.position.z + dirZ * 3.0
      );
      this._moveToward(fleeTarget, this.fleeSpeed, delta);
    }
  }

  _moveToward(target, speed, delta) {
    const dx = target.x - this.mob.position.x;
    const dz = target.z - this.mob.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 0.3) {
      this.hasTarget = false;
      return;
    }

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const nz = dz / dist;

    // Rotate toward movement direction
    const targetYaw = Math.atan2(nx, nz);
    let diff = targetYaw - this.mob.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.mob.yaw += diff * Math.min(1.0, delta * 8.0);

    // Apply forward horizontal velocity
    this.mob.velocity.x = nx * speed;
    this.mob.velocity.z = nz * speed;

    // If flying (Bird)
    if (this.isFlying) {
      const dy = (target.y || this.mob.position.y) - this.mob.position.y;
      this.mob.velocity.y = Math.max(-2.0, Math.min(2.0, dy * 0.8));
    } else if (this.mob.isGrounded) {
      // Auto-hop if encountering 1-block height step ahead
      const checkX = this.mob.position.x + nx * 0.8;
      const checkZ = this.mob.position.z + nz * 0.8;
      const blockAhead = this.mob.world.getBlock(
        Math.floor(checkX),
        Math.floor(this.mob.position.y + 0.3),
        Math.floor(checkZ)
      );
      if (blockAhead > 0 && blockAhead !== 19) {
        this.mob.velocity.y = 7.2; // Jump up
      }
    }
  }

  _pickRandomTarget() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6.0 + Math.random() * 8.0;
    this.targetPos.set(
      this.mob.position.x + Math.cos(angle) * radius,
      this.isFlying ? 28.0 + Math.random() * 12.0 : this.mob.position.y,
      this.mob.position.z + Math.sin(angle) * radius
    );
    this.hasTarget = true;
  }

  onDamaged(attackerPos) {
    if (this.isHostile) {
      this.state = AI_STATE.CHASE;
    } else if (this.isNeutral) {
      // Boar turns defensive
      this.isHostile = true;
      this.state = AI_STATE.CHASE;
    } else {
      // Passive deer/bird flees
      this.state = AI_STATE.FLEE;
      this.stateTimer = 6.0;
    }
  }
}
