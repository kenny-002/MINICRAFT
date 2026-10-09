import * as THREE from 'three';
import { ItemRegistry, TOOL_TYPES } from '../items/ItemTypes.js';

/**
 * Melee Combat System for BlockWorld Version 4.
 * Handles attack cooldowns, raycast hit detection, knockback, damage distribution,
 * and weapon durability wear.
 */
export class CombatSystem {
  constructor(player, entityManager, soundSystem) {
    this.player = player;
    this.entityManager = entityManager;
    this.sound = soundSystem;

    this.attackCooldownTimer = 0;
    this.baseAttackCooldown = 0.45; // Seconds
    this.baseDamage = 3;
    this.baseRange = 3.2;

    // Callbacks
    this.onHitMob = null; // (mob, damage, isCritical) => {}
  }

  canAttack() {
    return this.attackCooldownTimer <= 0;
  }

  update(delta) {
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }
  }

  /**
   * Performs an attack sweep in front of player
   */
  performAttack(hotbar) {
    if (!this.canAttack() || !this.player || !this.entityManager) return false;

    // 1. Resolve Held Weapon Attributes
    const selectedSlot = hotbar ? hotbar.getSelectedSlot() : null;
    const itemDef = selectedSlot ? ItemRegistry.get(selectedSlot.itemId) : null;

    let damage = this.baseDamage;
    let range = this.baseRange;
    let cooldown = this.baseAttackCooldown;

    if (itemDef) {
      if (itemDef.damage) damage = itemDef.damage;
      if (itemDef.range) range = itemDef.range;
      if (itemDef.attackSpeed) cooldown = 1.0 / itemDef.attackSpeed;
    }

    this.attackCooldownTimer = cooldown;

    // 2. Raycast from camera center to detect target creature
    const origin = this.player.camera.position.clone();
    const direction = new THREE.Vector3();
    this.player.camera.getWorldDirection(direction);

    const hitMob = this.entityManager.findMobInRay(origin, direction, range);

    if (hitMob) {
      // Calculate Knockback Vector
      const knockback = direction.clone().multiplyScalar(6.5);
      knockback.y = 3.5;

      // Apply damage to mob
      hitMob.takeDamage(damage, knockback, this.player);

      // Sound feedback
      if (this.sound) {
        this.sound.playCombatHit?.();
      }

      // Damage active weapon durability
      if (selectedSlot && itemDef && itemDef.durability) {
        hotbar.damageActiveTool(1);
      }

      if (this.onHitMob) {
        this.onHitMob(hitMob, damage, false);
      }

      return { hit: true, mob: hitMob, damage };
    } else {
      // Miss swing sound
      if (this.sound) {
        this.sound.playCombatSwing?.();
      }
      return { hit: false };
    }
  }
}
