import { ITEMS } from '../items/ItemTypes.js';

/**
 * Fuel burn duration ratings (in seconds)
 */
export const FUELS = {
  [ITEMS.COAL_LUMP]: 24.0,
  [ITEMS.WOOD]: 14.0,
  [ITEMS.PINE_WOOD]: 14.0,
  [ITEMS.TIMBER_PLANK]: 8.0,
  [ITEMS.FIBER_STICK]: 3.5,
};

/**
 * Smelting & Cooking Recipes for Charcoal Smelter
 */
export const SMELTING_RECIPES = [
  {
    id: 'smelt_iron_ore',
    input: ITEMS.IRON_ORE,
    output: ITEMS.IRON_INGOT,
    outputCount: 1,
    duration: 3.5,
  },
  {
    id: 'smelt_deepslate_iron_ore',
    input: ITEMS.DEEPSLATE_IRON_ORE,
    output: ITEMS.IRON_INGOT,
    outputCount: 1,
    duration: 3.5,
  },
  {
    id: 'smelt_gold_ore',
    input: ITEMS.GOLD_ORE,
    output: ITEMS.GOLD_INGOT,
    outputCount: 1,
    duration: 4.0,
  },
  {
    id: 'smelt_deepslate_gold_ore',
    input: ITEMS.DEEPSLATE_GOLD_ORE,
    output: ITEMS.GOLD_INGOT,
    outputCount: 1,
    duration: 4.0,
  },
  {
    id: 'smelt_copper_ore',
    input: ITEMS.COPPER_ORE,
    output: ITEMS.COPPER_INGOT,
    outputCount: 1,
    duration: 3.0,
  },
  {
    id: 'smelt_deepslate_copper_ore',
    input: ITEMS.DEEPSLATE_COPPER_ORE,
    output: ITEMS.COPPER_INGOT,
    outputCount: 1,
    duration: 3.0,
  },
  {
    id: 'smelt_crystal_ore',
    input: ITEMS.CRYSTAL_ORE,
    output: ITEMS.CRYSTAL_SHARD,
    outputCount: 1,
    duration: 5.0,
  },
  {
    id: 'smelt_deepslate_crystal_ore',
    input: ITEMS.DEEPSLATE_CRYSTAL_ORE,
    output: ITEMS.CRYSTAL_SHARD,
    outputCount: 1,
    duration: 5.0,
  },
  {
    id: 'cook_raw_meat',
    input: ITEMS.RAW_MEAT,
    output: ITEMS.COOKED_MEAT,
    outputCount: 1,
    duration: 2.5,
  },
  {
    id: 'smelt_stone_cobble',
    input: ITEMS.STONE,
    output: ITEMS.SANDSTONE,
    outputCount: 1,
    duration: 2.0,
  },
];

export function getSmeltingRecipe(inputItemId) {
  return SMELTING_RECIPES.find((r) => r.input === inputItemId) || null;
}

export function isFuel(itemId) {
  return FUELS[itemId] !== undefined;
}

export function getFuelBurnTime(itemId) {
  return FUELS[itemId] || 0;
}
