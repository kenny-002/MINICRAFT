import { ArmorSystem } from '../armor/ArmorSystem.js';

/**
 * Player Survival Stats: Health, Hunger, Natural Regeneration,
 * Fall Damage calculations, and Starvation.
 */
export class PlayerStats {
  constructor(player) {
    this.player = player;

    this.maxHealth = 100;
    this.health = 100;

    this.maxHunger = 100;
    this.hunger = 100;

    this.regenTimer = 0;
    this.starveTimer = 0;
    this.isDead = false;
    this.lastCauseOfDeath = 'Mysterious Forces';

    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _notify(event = {}) {
    for (const cb of this.listeners) {
      cb(this, event);
    }
  }

  update(delta, isMoving, isSprinting, isGrounded) {
    if (this.isDead) return;

    // 1. Hunger Drain
    let drainRate = 0.05; // Base resting metabolic rate
    if (isMoving) {
      drainRate = isSprinting ? 0.45 : 0.12;
    }

    this.hunger = Math.max(0, this.hunger - drainRate * delta);

    // 2. Natural Health Regeneration (when well-fed: hunger >= 80)
    if (this.hunger >= 80 && this.health < this.maxHealth) {
      this.regenTimer += delta;
      if (this.regenTimer >= 3.0) {
        this.heal(3);
        this.hunger = Math.max(0, this.hunger - 1.5);
        this.regenTimer = 0;
      }
    } else {
      this.regenTimer = 0;
    }

    // 3. Starvation Damage (when hunger is 0)
    if (this.hunger <= 0) {
      this.starveTimer += delta;
      if (this.starveTimer >= 4.0) {
        this.takeDamage(4, 'starvation', 'Starvation');
        this.starveTimer = 0;
      }
    } else {
      this.starveTimer = 0;
    }

    this._notify({ type: 'tick' });
  }

  takeDamage(rawAmount, source = 'generic', customCause = null) {
    if (this.isDead) return;

    // Calculate Armor Absorption if player inventory has equipped armor
    let amount = rawAmount;
    if (this.player && this.player.inventory && source !== 'starvation' && source !== 'fall') {
      const defense = ArmorSystem.getTotalDefense(this.player.inventory);
      ArmorSystem.damageEquippedArmor(this.player.inventory, 1);
      amount = ArmorSystem.applyDamageReduction(rawAmount, defense);
    }

    const prev = this.health;
    this.health = Math.max(0, this.health - amount);

    let cause = customCause;
    if (!cause) {
      if (source === 'fall') cause = 'Fell from a high cliff';
      else if (source === 'starvation') cause = 'Succumbed to starvation';
      else cause = 'Slain in combat';
    }
    this.lastCauseOfDeath = cause;

    this._notify({ type: 'damage', amount, source, prevHealth: prev, currentHealth: this.health, cause });

    if (this.health <= 0) {
      this.triggerDeath(cause);
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
    this._notify({ type: 'heal', amount });
  }

  eat(foodItem) {
    if (this.isDead) return false;
    if (this.hunger >= this.maxHunger) return false; // Already full

    const hungerGain = foodItem.hungerRestore || 15;
    const healthGain = foodItem.healthRestore || 0;

    this.hunger = Math.min(this.maxHunger, this.hunger + hungerGain);
    if (healthGain > 0) {
      this.heal(healthGain);
    }

    this._notify({ type: 'eat', foodItem });
    return true;
  }

  drainHunger(amount) {
    if (this.isDead) return;
    this.hunger = Math.max(0, this.hunger - amount);
    this._notify({ type: 'hunger_drain', amount });
  }

  calculateFallDamage(landingVelocityY) {
    const downwardSpeed = Math.abs(landingVelocityY);
    const safeThreshold = 14.0; // Safe drop speed

    if (downwardSpeed > safeThreshold) {
      const excess = downwardSpeed - safeThreshold;
      return Math.round(excess * 5.0);
    }
    return 0;
  }

  applyFallDamage(landingVelocityY) {
    const damage = this.calculateFallDamage(landingVelocityY);
    if (damage > 0) {
      this.takeDamage(damage, 'fall', 'Fell from a severe altitude');
    }
  }

  triggerDeath(cause = null) {
    if (this.isDead) return;
    this.isDead = true;
    this.health = 0;
    const deathCause = cause || this.lastCauseOfDeath || 'Perished';
    this._notify({ type: 'death', cause: deathCause });
    if (typeof this.onDeath === 'function') {
      this.onDeath(deathCause);
    }
  }

  reset() {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.isDead = false;
    this.regenTimer = 0;
    this.starveTimer = 0;
    this._notify({ type: 'reset' });
  }

  respawn() {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.isDead = false;
    this.regenTimer = 0;
    this.starveTimer = 0;

    if (this.player) {
      this.player.spawnAtSafePosition(0, 0);
    }

    this._notify({ type: 'respawn' });
  }

  loadState(savedStats) {
    if (!savedStats) return;
    if (savedStats.health !== undefined) this.health = savedStats.health;
    if (savedStats.hunger !== undefined) this.hunger = savedStats.hunger;
    this.isDead = false;
    this._notify({ type: 'load' });
  }

  getSaveState() {
    return {
      health: Math.round(this.health),
      hunger: Math.round(this.hunger),
    };
  }
}
