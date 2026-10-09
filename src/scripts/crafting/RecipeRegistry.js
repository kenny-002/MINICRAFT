import { ITEMS } from '../items/ItemTypes.js';

/**
 * Complete Recipe Registry for BlockWorld Version 4
 */
export const RECIPES = [
  // --- Field Crafting (Hand / Pocket) ---
  {
    id: 'recipe_timber_planks_oak',
    name: 'Timber Planks (Oak)',
    output: { itemId: ITEMS.TIMBER_PLANK, count: 4 },
    inputs: [{ itemId: ITEMS.WOOD, count: 1 }],
    requiresBench: false,
    category: 'materials',
  },
  {
    id: 'recipe_timber_planks_pine',
    name: 'Timber Planks (Pine)',
    output: { itemId: ITEMS.TIMBER_PLANK, count: 4 },
    inputs: [{ itemId: ITEMS.PINE_WOOD, count: 1 }],
    requiresBench: false,
    category: 'materials',
  },
  {
    id: 'recipe_fiber_sticks',
    name: 'Fiber Sticks',
    output: { itemId: ITEMS.FIBER_STICK, count: 4 },
    inputs: [{ itemId: ITEMS.TIMBER_PLANK, count: 2 }],
    requiresBench: false,
    category: 'materials',
  },
  {
    id: 'recipe_crafting_bench',
    name: 'Crafting Bench',
    output: { itemId: ITEMS.CRAFTING_BENCH, count: 1 },
    inputs: [{ itemId: ITEMS.TIMBER_PLANK, count: 4 }],
    requiresBench: false,
    category: 'stations',
  },
  {
    id: 'recipe_torch',
    name: 'Ember Torches',
    output: { itemId: ITEMS.TORCH, count: 4 },
    inputs: [
      { itemId: ITEMS.COAL_LUMP, count: 1 },
      { itemId: ITEMS.FIBER_STICK, count: 1 },
    ],
    requiresBench: false,
    category: 'stations',
  },
  {
    id: 'recipe_wood_pickaxe',
    name: 'Wooden Pickaxe',
    output: { itemId: ITEMS.WOOD_PICKAXE, count: 1 },
    inputs: [
      { itemId: ITEMS.TIMBER_PLANK, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: false,
    category: 'tools',
  },
  {
    id: 'recipe_wood_axe',
    name: 'Wooden Axe',
    output: { itemId: ITEMS.WOOD_AXE, count: 1 },
    inputs: [
      { itemId: ITEMS.TIMBER_PLANK, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: false,
    category: 'tools',
  },
  {
    id: 'recipe_wood_hoe',
    name: 'Wooden Hoe',
    output: { itemId: ITEMS.WOOD_HOE, count: 1 },
    inputs: [
      { itemId: ITEMS.TIMBER_PLANK, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: false,
    category: 'tools',
  },
  {
    id: 'recipe_wood_sword',
    name: 'Wooden Sword',
    output: { itemId: ITEMS.WOOD_SWORD, count: 1 },
    inputs: [
      { itemId: ITEMS.TIMBER_PLANK, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 1 },
    ],
    requiresBench: false,
    category: 'weapons',
  },

  // --- Advanced Bench Crafting (Requires Crafting Bench) ---
  {
    id: 'recipe_charcoal_smelter',
    name: 'Charcoal Smelter',
    output: { itemId: ITEMS.CHARCOAL_SMELTER, count: 1 },
    inputs: [{ itemId: ITEMS.STONE, count: 8 }],
    requiresBench: true,
    category: 'stations',
  },
  {
    id: 'recipe_storage_chest',
    name: 'Storage Chest',
    output: { itemId: ITEMS.STORAGE_CHEST, count: 1 },
    inputs: [{ itemId: ITEMS.TIMBER_PLANK, count: 8 }],
    requiresBench: true,
    category: 'stations',
  },
  {
    id: 'recipe_stone_pickaxe',
    name: 'Stone Pickaxe',
    output: { itemId: ITEMS.STONE_PICKAXE, count: 1 },
    inputs: [
      { itemId: ITEMS.STONE, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_stone_axe',
    name: 'Stone Axe',
    output: { itemId: ITEMS.STONE_AXE, count: 1 },
    inputs: [
      { itemId: ITEMS.STONE, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_stone_hoe',
    name: 'Stone Hoe',
    output: { itemId: ITEMS.STONE_HOE, count: 1 },
    inputs: [
      { itemId: ITEMS.STONE, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_stone_sword',
    name: 'Stone Sword',
    output: { itemId: ITEMS.STONE_SWORD, count: 1 },
    inputs: [
      { itemId: ITEMS.STONE, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 1 },
    ],
    requiresBench: true,
    category: 'weapons',
  },
  {
    id: 'recipe_iron_pickaxe',
    name: 'Iron Pickaxe',
    output: { itemId: ITEMS.IRON_PICKAXE, count: 1 },
    inputs: [
      { itemId: ITEMS.IRON_INGOT, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_iron_axe',
    name: 'Iron Axe',
    output: { itemId: ITEMS.IRON_AXE, count: 1 },
    inputs: [
      { itemId: ITEMS.IRON_INGOT, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_iron_hoe',
    name: 'Iron Hoe',
    output: { itemId: ITEMS.IRON_HOE, count: 1 },
    inputs: [
      { itemId: ITEMS.IRON_INGOT, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_iron_sword',
    name: 'Iron Longsword',
    output: { itemId: ITEMS.IRON_SWORD, count: 1 },
    inputs: [
      { itemId: ITEMS.IRON_INGOT, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 1 },
    ],
    requiresBench: true,
    category: 'weapons',
  },
  {
    id: 'recipe_crystal_pickaxe',
    name: 'Prismatic Crystal Pickaxe',
    output: { itemId: ITEMS.CRYSTAL_PICKAXE, count: 1 },
    inputs: [
      { itemId: ITEMS.CRYSTAL_SHARD, count: 3 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_crystal_hoe',
    name: 'Crystal Cultivation Hoe',
    output: { itemId: ITEMS.CRYSTAL_HOE, count: 1 },
    inputs: [
      { itemId: ITEMS.CRYSTAL_SHARD, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 2 },
    ],
    requiresBench: true,
    category: 'tools',
  },
  {
    id: 'recipe_crystal_sword',
    name: 'Prismatic Crystal Blade',
    output: { itemId: ITEMS.CRYSTAL_SWORD, count: 1 },
    inputs: [
      { itemId: ITEMS.CRYSTAL_SHARD, count: 2 },
      { itemId: ITEMS.FIBER_STICK, count: 1 },
    ],
    requiresBench: true,
    category: 'weapons',
  },

  // --- Armor Sets ---
  {
    id: 'recipe_iron_helmet',
    name: 'Iron Visor Helmet',
    output: { itemId: ITEMS.IRON_HELMET, count: 1 },
    inputs: [{ itemId: ITEMS.IRON_INGOT, count: 5 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_iron_chestplate',
    name: 'Iron Cuirass Chestplate',
    output: { itemId: ITEMS.IRON_CHESTPLATE, count: 1 },
    inputs: [{ itemId: ITEMS.IRON_INGOT, count: 8 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_iron_leggings',
    name: 'Iron Greaves Leggings',
    output: { itemId: ITEMS.IRON_LEGGINGS, count: 1 },
    inputs: [{ itemId: ITEMS.IRON_INGOT, count: 7 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_iron_boots',
    name: 'Iron Sabatons Boots',
    output: { itemId: ITEMS.IRON_BOOTS, count: 1 },
    inputs: [{ itemId: ITEMS.IRON_INGOT, count: 4 }],
    requiresBench: true,
    category: 'armor',
  },

  {
    id: 'recipe_crystal_helmet',
    name: 'Crystal Crown Helmet',
    output: { itemId: ITEMS.CRYSTAL_HELMET, count: 1 },
    inputs: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 5 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_crystal_chestplate',
    name: 'Crystal Carapace Chestplate',
    output: { itemId: ITEMS.CRYSTAL_CHESTPLATE, count: 1 },
    inputs: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 8 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_crystal_leggings',
    name: 'Crystal Cuisses Leggings',
    output: { itemId: ITEMS.CRYSTAL_LEGGINGS, count: 1 },
    inputs: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 7 }],
    requiresBench: true,
    category: 'armor',
  },
  {
    id: 'recipe_crystal_boots',
    name: 'Crystal Stride Boots',
    output: { itemId: ITEMS.CRYSTAL_BOOTS, count: 1 },
    inputs: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 4 }],
    requiresBench: true,
    category: 'armor',
  },

  // Food & Sustenance
  {
    id: 'recipe_mushroom_stew',
    name: 'Savory Mushroom Stew',
    output: { itemId: ITEMS.MUSHROOM_STEW, count: 1 },
    inputs: [
      { itemId: ITEMS.MUSHROOM, count: 2 },
      { itemId: ITEMS.WILD_BERRIES, count: 1 },
    ],
    requiresBench: false,
    category: 'food',
  },
  {
    id: 'recipe_survival_ration',
    name: 'Survival Ration',
    output: { itemId: ITEMS.COOKED_RATION, count: 1 },
    inputs: [
      { itemId: ITEMS.DESERT_FRUIT, count: 1 },
      { itemId: ITEMS.WILD_BERRIES, count: 2 },
      { itemId: ITEMS.COAL_LUMP, count: 1 },
    ],
    requiresBench: true,
    category: 'food',
  },
];

export function getRecipesByCategory(category, isNearBench = false) {
  return RECIPES.filter((r) => {
    if (!isNearBench && r.requiresBench) return false;
    if (category === 'ALL') return true;
    return r.category.toUpperCase() === category.toUpperCase();
  });
}

export function getRecipeById(recipeId) {
  return RECIPES.find((r) => r.id === recipeId) || null;
}
