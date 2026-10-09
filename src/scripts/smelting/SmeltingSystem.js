import { getSmeltingRecipe, getFuelBurnTime, isFuel } from './SmeltingRecipes.js';

/**
 * Smelting System managing individual furnace states across world coordinates.
 */
export class SmeltingSystem {
  constructor() {
    this.smelters = new Map(); // key: 'x,y,z' -> SmelterState
    this.activeSmelterKey = null;
  }

  getSmelter(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!this.smelters.has(key)) {
      this.smelters.set(key, {
        x,
        y,
        z,
        input: null, // { itemId, count }
        fuel: null, // { itemId, count }
        output: null, // { itemId, count }
        burnTimeRemaining: 0,
        maxBurnTime: 0,
        cookProgress: 0,
        maxCookDuration: 3.5,
        isActive: false,
      });
    }
    return this.smelters.get(key);
  }

  removeSmelter(x, y, z) {
    const key = `${x},${y},${z}`;
    const state = this.smelters.get(key);
    let items = [];
    if (state) {
      if (state.input && state.input.count > 0) items.push(state.input);
      if (state.fuel && state.fuel.count > 0) items.push(state.fuel);
      if (state.output && state.output.count > 0) items.push(state.output);
      this.smelters.delete(key);
    }
    return items;
  }

  update(delta) {
    for (const [key, state] of this.smelters.entries()) {
      this._updateSmelter(state, delta);
    }
  }

  _updateSmelter(state, delta) {
    const recipe = state.input ? getSmeltingRecipe(state.input.itemId) : null;
    const canCook = recipe && (!state.output || (state.output.itemId === recipe.output && state.output.count < 64));

    // 1. Consume Fuel if needed and fire is out
    if (state.burnTimeRemaining <= 0 && canCook && state.fuel && state.fuel.count > 0 && isFuel(state.fuel.itemId)) {
      const burnDuration = getFuelBurnTime(state.fuel.itemId);
      state.burnTimeRemaining = burnDuration;
      state.maxBurnTime = burnDuration;
      state.fuel.count--;
      if (state.fuel.count <= 0) {
        state.fuel = null;
      }
    }

    // 2. Burning & Cooking Progress
    if (state.burnTimeRemaining > 0) {
      state.burnTimeRemaining -= delta;
      state.isActive = true;

      if (canCook) {
        state.maxCookDuration = recipe.duration;
        state.cookProgress += delta;

        if (state.cookProgress >= recipe.duration) {
          // Finished cooking item
          state.cookProgress = 0;
          state.input.count--;
          if (state.input.count <= 0) {
            state.input = null;
          }

          if (!state.output) {
            state.output = { itemId: recipe.output, count: recipe.outputCount };
          } else {
            state.output.count += recipe.outputCount;
          }
        }
      } else {
        state.cookProgress = Math.max(0, state.cookProgress - delta * 0.5);
      }
    } else {
      state.isActive = false;
      state.burnTimeRemaining = 0;
      state.cookProgress = Math.max(0, state.cookProgress - delta * 0.8);
    }
  }

  saveState() {
    const data = {};
    for (const [k, v] of this.smelters.entries()) {
      data[k] = {
        x: v.x,
        y: v.y,
        z: v.z,
        input: v.input ? { ...v.input } : null,
        fuel: v.fuel ? { ...v.fuel } : null,
        output: v.output ? { ...v.output } : null,
        burnTimeRemaining: v.burnTimeRemaining,
        maxBurnTime: v.maxBurnTime,
        cookProgress: v.cookProgress,
      };
    }
    return data;
  }

  loadState(data) {
    this.smelters.clear();
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      this.smelters.set(k, {
        ...v,
        maxCookDuration: 3.5,
        isActive: v.burnTimeRemaining > 0,
      });
    }
  }
}
