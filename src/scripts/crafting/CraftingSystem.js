import { RECIPES } from './RecipeRegistry.js';
import { ITEM_DEFINITIONS } from '../items/ItemTypes.js';

/**
 * Crafting System: validates ingredient availability, crafting bench proximity,
 * and handles craft execution into player inventory.
 */
export class CraftingSystem {
  constructor(inventory) {
    this.inventory = inventory;
    this.isNearBench = false;
  }

  setNearBench(isNear) {
    this.isNearBench = isNear;
  }

  /**
   * Returns list of all recipes valid in the current context
   */
  getAvailableRecipes(onlyCraftable = false) {
    return RECIPES.filter((recipe) => {
      // Bench check: if recipe requires bench, player must be interacting with one
      if (recipe.requiresBench && !this.isNearBench) {
        return false;
      }

      if (onlyCraftable) {
        return this.canCraft(recipe);
      }

      return true;
    });
  }

  /**
   * Checks if inventory has sufficient items for a recipe
   */
  canCraft(recipeOrId, isNearBenchOverride = null) {
    const recipe = typeof recipeOrId === 'string' ? RECIPES.find((r) => r.id === recipeOrId) : recipeOrId;
    if (!recipe || !recipe.inputs) return false;

    const nearBench = isNearBenchOverride !== null ? isNearBenchOverride : this.isNearBench;
    if (recipe.requiresBench && !nearBench) {
      return false;
    }

    for (const input of recipe.inputs) {
      const have = this.inventory.getItemCount(input.itemId);
      if (have < input.count) {
        return false;
      }
    }
    return true;
  }

  /**
   * Attempts to craft a recipe
   */
  craft(recipeOrId, isNearBenchOverride = null) {
    const recipe = typeof recipeOrId === 'string' ? RECIPES.find((r) => r.id === recipeOrId) : recipeOrId;
    if (!recipe) {
      return { success: false, reason: 'Invalid recipe!' };
    }

    const nearBench = isNearBenchOverride !== null ? isNearBenchOverride : this.isNearBench;
    if (recipe.requiresBench && !nearBench) {
      return { success: false, reason: 'Requires a Crafting Bench!' };
    }

    if (!this.canCraft(recipe, nearBench)) {
      return { success: false, reason: 'Missing required ingredients!' };
    }

    // Deduct inputs
    for (const input of recipe.inputs) {
      this.inventory.removeItem(input.itemId, input.count);
    }

    // Add output
    const outputDef = ITEM_DEFINITIONS[recipe.output.itemId];
    const initialDurability = outputDef && outputDef.durability ? outputDef.durability : null;

    this.inventory.addItem(recipe.output.itemId, recipe.output.count, initialDurability);

    return {
      success: true,
      output: recipe.output,
      name: outputDef ? outputDef.name : 'Item',
    };
  }
}
