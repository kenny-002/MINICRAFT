import { BLOCK } from '../blocks/BlockTypes.js';
import { ITEMS, TOOL_TIER } from './ItemTypes.js';

/**
 * Drop Table defining item drops and required tool tier for every block in BlockWorld Version 4.
 */
export const DROP_TABLE = {
  [BLOCK.GRASS]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.DIRT, count: 1 }],
  },
  [BLOCK.DIRT]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.DIRT, count: 1 }],
  },
  [BLOCK.STONE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.STONE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.SAND]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.SAND, count: 1 }],
  },
  [BLOCK.WOOD]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.WOOD, count: 1 }],
  },
  [BLOCK.LEAVES]: {
    requiredTier: TOOL_TIER.HAND,
    drops: (prng) => {
      const r = prng ? prng() : Math.random();
      if (r < 0.25) {
        return [{ itemId: ITEMS.WILD_BERRIES, count: 1 + Math.floor(Math.random() * 2) }];
      } else if (r < 0.50) {
        return [{ itemId: ITEMS.SEEDS_BERRY, count: 1 }];
      } else if (r < 0.85) {
        return [{ itemId: ITEMS.FIBER_STICK, count: 1 }];
      }
      return [{ itemId: ITEMS.FIBER_STICK, count: 1 }];
    },
  },
  [BLOCK.SNOW]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.SNOW, count: 1 }],
  },
  [BLOCK.SANDSTONE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.SANDSTONE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.ICE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.ICE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.CACTUS]: {
    requiredTier: TOOL_TIER.HAND,
    drops: (prng) => {
      const r = prng ? prng() : Math.random();
      const drops = [{ itemId: ITEMS.CACTUS, count: 1 }];
      if (r < 0.4) {
        drops.push({ itemId: ITEMS.DESERT_FRUIT, count: 1 });
      }
      return drops;
    },
  },
  [BLOCK.FLOWER_RED]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.FLOWER_RED, count: 1 }],
  },
  [BLOCK.FLOWER_YELLOW]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.FLOWER_YELLOW, count: 1 }],
  },
  [BLOCK.GRASS_PLANT]: {
    requiredTier: TOOL_TIER.HAND,
    drops: (prng) => {
      const r = prng ? prng() : Math.random();
      if (r < 0.35) {
        return [{ itemId: ITEMS.SEEDS_WHEAT, count: 1 }];
      } else if (r < 0.60) {
        return [{ itemId: ITEMS.SEEDS_ROOT, count: 1 }];
      } else if (r < 0.85) {
        return [{ itemId: ITEMS.FIBER_STICK, count: 1 }];
      }
      return [{ itemId: ITEMS.GRASS_PLANT, count: 1 }];
    },
  },
  [BLOCK.MUSHROOM]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.MUSHROOM, count: 1 }],
  },
  [BLOCK.COAL_ORE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.COAL_LUMP, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.IRON_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.IRON_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.GOLD_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.GOLD_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.CRYSTAL_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.PINE_WOOD]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.PINE_WOOD, count: 1 }],
  },
  [BLOCK.PINE_LEAVES]: {
    requiredTier: TOOL_TIER.HAND,
    drops: (prng) => {
      const r = prng ? prng() : Math.random();
      if (r < 0.4) {
        return [{ itemId: ITEMS.SEEDS_BERRY, count: 1 }];
      }
      return [{ itemId: ITEMS.FIBER_STICK, count: 1 }];
    },
  },
  [BLOCK.CRAFTING_BENCH]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.CRAFTING_BENCH, count: 1 }],
  },
  [BLOCK.CHARCOAL_SMELTER]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.CHARCOAL_SMELTER, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.STORAGE_CHEST]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.STORAGE_CHEST, count: 1 }],
  },
  [BLOCK.TORCH]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.TORCH, count: 1 }],
  },
  [BLOCK.TILLED_SOIL]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.DIRT, count: 1 }],
  },
  [BLOCK.CROP_WHEAT]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [
      { itemId: ITEMS.WHEAT, count: 1 },
      { itemId: ITEMS.SEEDS_WHEAT, count: 2 },
    ],
  },
  [BLOCK.CROP_BERRY]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [
      { itemId: ITEMS.WILD_BERRIES, count: 3 },
      { itemId: ITEMS.SEEDS_BERRY, count: 1 },
    ],
  },
  [BLOCK.CROP_ROOT]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [
      { itemId: ITEMS.ROOT_VEGETABLE, count: 2 },
      { itemId: ITEMS.SEEDS_ROOT, count: 1 },
    ],
  },
  [BLOCK.BEDROCK]: {
    requiredTier: 999, // Unbreakable
    drops: [],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.DEEPSLATE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.COPPER_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.COPPER_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.REDSTONE_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.REDSTONE_DUST, count: 4 }],
    fallbackDrops: [],
  },
  [BLOCK.LAPIS_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.LAPIS_LAZULI, count: 4 }],
    fallbackDrops: [],
  },
  [BLOCK.EMERALD_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.EMERALD, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.GRAVEL]: {
    requiredTier: TOOL_TIER.HAND,
    drops: (prng) => {
      const r = prng ? prng() : Math.random();
      return r < 0.12 ? [{ itemId: ITEMS.FLINT, count: 1 }] : [{ itemId: ITEMS.GRAVEL, count: 1 }];
    },
  },
  [BLOCK.CLAY]: {
    requiredTier: TOOL_TIER.HAND,
    drops: [{ itemId: ITEMS.CLAY_BALL, count: 4 }],
  },
  [BLOCK.COBBLESTONE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.COBBLESTONE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_COAL_ORE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.COAL_LUMP, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_IRON_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.IRON_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_GOLD_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.GOLD_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_CRYSTAL_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.CRYSTAL_SHARD, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_COPPER_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.COPPER_ORE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_REDSTONE_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.REDSTONE_DUST, count: 4 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_LAPIS_ORE]: {
    requiredTier: TOOL_TIER.STONE,
    drops: [{ itemId: ITEMS.LAPIS_LAZULI, count: 4 }],
    fallbackDrops: [],
  },
  [BLOCK.DEEPSLATE_EMERALD_ORE]: {
    requiredTier: TOOL_TIER.IRON,
    drops: [{ itemId: ITEMS.EMERALD, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.GRANITE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.GRANITE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.DIORITE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.DIORITE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.ANDESITE]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.ANDESITE, count: 1 }],
    fallbackDrops: [],
  },
  [BLOCK.TUFF]: {
    requiredTier: TOOL_TIER.WOOD,
    drops: [{ itemId: ITEMS.TUFF, count: 1 }],
    fallbackDrops: [],
  },
};

export class DropTable {
  /**
   * Resolves items dropped when breaking blockId with equipped toolTier
   */
  static getDrops(blockId, toolTier = TOOL_TIER.HAND) {
    const entry = DROP_TABLE[blockId];
    if (!entry) {
      return [];
    }

    if (toolTier >= entry.requiredTier) {
      if (typeof entry.drops === 'function') {
        return entry.drops();
      }
      return entry.drops;
    }

    // Insufficient tool tier
    return entry.fallbackDrops || [];
  }

  static getRequiredTier(blockId) {
    const entry = DROP_TABLE[blockId];
    return entry ? entry.requiredTier : TOOL_TIER.HAND;
  }

  static getDropDefinition(blockId) {
    return DROP_TABLE[blockId] || null;
  }
}
