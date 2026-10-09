import { ITEMS } from '../items/ItemTypes.js';

/**
 * Drop definitions for original BlockWorld Version 4 entities.
 */
export const MOB_DROPS = {
  MEADOW_DEER: [
    { itemId: ITEMS.RAW_MEAT, min: 1, max: 2, chance: 1.0 },
    { itemId: ITEMS.ANIMAL_HIDE, min: 1, max: 2, chance: 0.8 },
  ],
  FOREST_BOAR: [
    { itemId: ITEMS.RAW_MEAT, min: 2, max: 3, chance: 1.0 },
    { itemId: ITEMS.ANIMAL_HIDE, min: 1, max: 2, chance: 0.75 },
    { itemId: ITEMS.BOAR_TUSK, min: 1, max: 2, chance: 0.6 },
  ],
  SKY_BIRD: [
    { itemId: ITEMS.SEEDS_WHEAT, min: 1, max: 2, chance: 0.7 },
    { itemId: ITEMS.SEEDS_BERRY, min: 1, max: 1, chance: 0.4 },
  ],
  CAVE_STALKER: [
    { itemId: ITEMS.DARK_FRAGMENT, min: 1, max: 3, chance: 1.0 },
    { itemId: ITEMS.COAL_LUMP, min: 1, max: 2, chance: 0.5 },
  ],
  NIGHT_HOWLER: [
    { itemId: ITEMS.SHADOW_ESSENCE, min: 1, max: 2, chance: 1.0 },
    { itemId: ITEMS.ANIMAL_HIDE, min: 1, max: 2, chance: 0.6 },
  ],
};

export class MobDropTable {
  static getDrops(mobType) {
    const table = MOB_DROPS[mobType];
    if (!table) return [];

    const drops = [];
    for (const rule of table) {
      if (Math.random() <= rule.chance) {
        const count = Math.floor(Math.random() * (rule.max - rule.min + 1)) + rule.min;
        if (count > 0) {
          drops.push({ itemId: rule.itemId, count });
        }
      }
    }
    return drops;
  }
}
