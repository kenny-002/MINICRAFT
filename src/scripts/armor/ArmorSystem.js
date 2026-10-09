import { ItemRegistry, EQUIPMENT_SLOT } from '../items/ItemTypes.js';

/**
 * Armor and Equipment Defense System for BlockWorld Version 4.
 */
export class ArmorSystem {
  /**
   * Calculates total armor points from all equipped pieces
   */
  static getTotalDefense(inventory) {
    if (!inventory || !inventory.equipment) return 0;

    let totalDefense = 0;
    for (const slotKey of Object.values(EQUIPMENT_SLOT)) {
      const equipSlot = inventory.equipment[slotKey];
      if (equipSlot && equipSlot.itemId) {
        const itemDef = ItemRegistry.get(equipSlot.itemId);
        if (itemDef && itemDef.defense) {
          totalDefense += itemDef.defense;
        }
      }
    }
    return totalDefense;
  }

  /**
   * Calculates damage after armor absorption
   * Formula: damage = rawDamage * (100 / (100 + totalDefense * 3.5))
   */
  static applyDamageReduction(rawDamage, totalDefense) {
    if (totalDefense <= 0) return rawDamage;
    const factor = 100 / (100 + totalDefense * 3.5);
    return Math.max(1, Math.round(rawDamage * factor));
  }

  /**
   * Degrades durability of worn armor pieces upon taking damage
   */
  static damageEquippedArmor(inventory, amount = 1) {
    if (!inventory || !inventory.equipment) return;

    for (const slotKey of Object.values(EQUIPMENT_SLOT)) {
      const equipSlot = inventory.equipment[slotKey];
      if (equipSlot && equipSlot.durability !== null) {
        equipSlot.durability -= amount;
        if (equipSlot.durability <= 0) {
          inventory.equipment[slotKey] = null; // Armor piece broke!
        }
      }
    }
  }
}
