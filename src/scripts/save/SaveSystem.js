import { IndexedDBAdapter } from './IndexedDBAdapter.js';
import { FileSystemAdapter } from './FileSystemAdapter.js';

/**
 * SaveSystem for MINICRAFT Version 6.1.
 * Provides resilient multi-world management, IndexedDB storage,
 * physical "MINICRAFT Worlds" directory synchronization via File System Access API,
 * backward-compatible legacy save migration, debounced dirty-state saving, and export/import.
 */
export class SaveSystem {
  static db = new IndexedDBAdapter();
  static fs = new FileSystemAdapter();

  static activeWorldId = null;
  static activeWorldName = 'Survival World';
  static isSaving = false;
  static lastSavedTimestamp = null;
  static onSaveStateChange = null; // callback(isSaving, timestamp)

  // Static save keys for backward compatibility
  static SAVE_KEY = 'blockworld_save_v4';
  static V4_SAVE_KEY = 'blockworld_save_v4';
  static V3_SAVE_KEY = 'blockworld_save_v3';
  static V2_SAVE_KEY = 'blockworld_save_v2';
  static LEGACY_SAVE_KEY = 'blockworld_save_v1';

  // Legacy localStorage keys for migration
  static LEGACY_KEYS = [
    { key: 'blockworld_save_v4', version: 4 },
    { key: 'blockworld_save_v3', version: 3 },
    { key: 'blockworld_save_v2', version: 2 },
    { key: 'blockworld_save_v1', version: 1 },
  ];

  /**
   * Initialize SaveSystem, ensure DB ready and run legacy migration if needed
   */
  static async init() {
    await SaveSystem.db.ready();
    await SaveSystem._migrateLegacySaves();
  }

  /**
   * Migrate any legacy single-world localStorage saves into IndexedDB
   */
  static async _migrateLegacySaves() {
    try {
      const existingWorlds = await SaveSystem.db.getAllWorlds();
      if (existingWorlds.length > 0) {
        // Worlds already exist in IndexedDB; migration has already run or new worlds exist
        return;
      }

      // Check localStorage for old saves
      for (const legacy of SaveSystem.LEGACY_KEYS) {
        const raw = localStorage.getItem(legacy.key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const worldId = `world_migrated_${Date.now().toString(36)}`;
            const migratedWorld = {
              id: worldId,
              name: `Survival World (v${legacy.version})`,
              seed: data.seed || 'Minicraft-Seed-1',
              createdAt: data.savedAt || Date.now(),
              lastPlayedAt: data.savedAt || Date.now(),
              playtime: 0,
              worldVersion: 6,
              modifiedBlocks: data.modifiedBlocks || {},
              timeOfDay: data.timeOfDay !== undefined ? data.timeOfDay : 0.25,
              player: data.player || {
                x: 0,
                y: 15,
                z: 0,
                pitch: 0,
                yaw: 0,
                health: 100,
                hunger: 100,
                isDead: false,
              },
              selectedHotbarIndex: data.selectedHotbarIndex || 0,
              inventory: data.inventory || [],
              equipment: data.equipment || { head: null, chest: null, legs: null, feet: null },
              chests: data.chests || {},
              smelters: data.smelters || {},
              crops: data.crops || {},
              itemDrops: data.itemDrops || [],
              entities: [],
            };

            await SaveSystem.db.saveWorld(migratedWorld);
            console.log(`Migrated legacy ${legacy.key} into IndexedDB world "${migratedWorld.name}" (${worldId})`);
            break;
          } catch (e) {
            console.warn(`Failed to parse legacy save ${legacy.key}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn('Legacy migration error:', err);
    }
  }

  /**
   * Retrieve list of all saved worlds (sorted by last played)
   */
  static async listWorlds() {
    await SaveSystem.init();
    return await SaveSystem.db.getAllWorlds();
  }

  /**
   * Retrieve a specific world by ID
   */
  static async getWorld(id) {
    await SaveSystem.init();
    return await SaveSystem.db.getWorld(id);
  }

  /**
   * Check if any saved worlds exist
   */
  static async hasSave() {
    const worlds = await SaveSystem.listWorlds();
    return worlds.length > 0;
  }

  /**
   * Load the most recently played world or a specific world
   */
  static load(worldId = null) {
    if (typeof indexedDB === 'undefined' && typeof localStorage !== 'undefined') {
      try {
        for (const lk of SaveSystem.LEGACY_KEYS) {
          const raw = localStorage.getItem(lk.key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (!parsed.worldVersion) parsed.worldVersion = lk.version;
            return parsed;
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    }
    return (async () => {
      await SaveSystem.init();
      if (worldId) {
        return await SaveSystem.db.getWorld(worldId);
      }
      const worlds = await SaveSystem.db.getAllWorlds();
      return worlds.length > 0 ? worlds[0] : null;
    })();
  }

  /**
   * Create a new world record with 100% empty survival inventory
   */
  static async createNewWorldRecord(name, seed) {
    await SaveSystem.init();
    const id = `world_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const finalName = (name && name.trim()) || `World ${seed}`;
    const finalSeed = (seed && seed.trim()) || 'Minicraft-Seed-1';

    const newWorld = {
      id,
      name: finalName,
      seed: finalSeed,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playtime: 0,
      worldVersion: 6,
      modifiedBlocks: {},
      timeOfDay: 0.25,
      player: {
        x: 0,
        y: 15,
        z: 0,
        pitch: 0,
        yaw: 0,
        health: 100,
        hunger: 100,
        isDead: false,
      },
      selectedHotbarIndex: 0,
      inventory: new Array(36).fill(null), // 100% Empty Survival Starter Inventory
      equipment: { head: null, chest: null, legs: null, feet: null },
      chests: {},
      smelters: {},
      crops: {},
      itemDrops: [],
      entities: [],
    };

    await SaveSystem.db.saveWorld(newWorld);
    SaveSystem.activeWorldId = id;
    SaveSystem.activeWorldName = finalName;

    // Physical folder sync if connected
    if (SaveSystem.fs.directoryHandle) {
      await SaveSystem.fs.syncWorldToDirectory(newWorld);
    }

    return newWorld;
  }

  /**
   * Save the currently active world state
   */
  static save(world, player, inventory, dayNightCycle, hotbar, storageSystem, smeltingSystem, farmingSystem, itemDropManager, entityManager) {
    if (!SaveSystem.activeWorldId) {
      // Fallback: assign or generate an ID based on seed
      SaveSystem.activeWorldId = `world_${Date.now().toString(36)}`;
    }

    const worldRecord = {
      id: SaveSystem.activeWorldId,
      name: SaveSystem.activeWorldName || `World ${world?.seed || '1'}`,
      seed: world?.seed || 'Minicraft-Seed-1',
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playtime: 1,
      worldVersion: 6,
      modifiedBlocks: world?.modifiedBlocks ? { ...world.modifiedBlocks } : {},
      timeOfDay: dayNightCycle ? dayNightCycle.timeOfDay : 0.25,
      player: {
        x: player ? player.position.x : 0,
        y: player ? player.position.y : 15,
        z: player ? player.position.z : 0,
        pitch: player?.cameraController ? player.cameraController.pitch : 0,
        yaw: player?.cameraController ? player.cameraController.yaw : 0,
        health: player?.stats ? player.stats.health : 100,
        hunger: player?.stats ? player.stats.hunger : 100,
        isDead: player?.stats ? player.stats.isDead : false,
      },
      selectedHotbarIndex: hotbar ? hotbar.selectedIndex : 0,
      inventory: inventory ? inventory.getAllItems() : [],
      equipment: inventory?.equipment ? { ...inventory.equipment } : { head: null, chest: null, legs: null, feet: null },
      chests: storageSystem ? storageSystem.saveState() : {},
      smelters: smeltingSystem ? smeltingSystem.saveState() : {},
      crops: farmingSystem ? farmingSystem.saveState() : {},
      itemDrops: itemDropManager && typeof itemDropManager.saveState === 'function' ? itemDropManager.saveState() : [],
      entities: entityManager && typeof entityManager.saveState === 'function' ? entityManager.saveState() : [],
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('blockworld_save_v4', JSON.stringify(worldRecord));
      }
    } catch (e) {}

    if (typeof indexedDB === 'undefined') {
      return { success: true, timestamp: Date.now(), worldId: SaveSystem.activeWorldId };
    }

    return (async () => {
      SaveSystem.isSaving = true;
      if (SaveSystem.onSaveStateChange) SaveSystem.onSaveStateChange(true, null);

      try {
        const existing = (await SaveSystem.db.getWorld(SaveSystem.activeWorldId)) || {};
        worldRecord.name = existing.name || worldRecord.name;
        worldRecord.createdAt = existing.createdAt || worldRecord.createdAt;
        worldRecord.playtime = (existing.playtime || 0) + 1;

        // 1. Save to IndexedDB (Primary Storage)
        await SaveSystem.db.saveWorld(worldRecord);

        // 2. Physical folder sync if connected
        if (SaveSystem.fs.directoryHandle) {
          await SaveSystem.fs.syncWorldToDirectory(worldRecord);
        }

        SaveSystem.lastSavedTimestamp = Date.now();
        SaveSystem.isSaving = false;
        if (SaveSystem.onSaveStateChange) SaveSystem.onSaveStateChange(false, SaveSystem.lastSavedTimestamp);

        return { success: true, timestamp: SaveSystem.lastSavedTimestamp, worldId: SaveSystem.activeWorldId };
      } catch (err) {
        console.error('Failed to save world:', err);
        SaveSystem.isSaving = false;
        if (SaveSystem.onSaveStateChange) SaveSystem.onSaveStateChange(false, null);
        return { success: false, error: err };
      }
    })();
  }

  /**
   * Apply loaded state to world, player, inventory, stats, and systems
   */
  static applyToWorld(saveData, world, player, inventory, dayNightCycle, hotbar, storageSystem, smeltingSystem, farmingSystem, itemDropManager, entityManager) {
    if (!saveData) return false;

    SaveSystem.activeWorldId = saveData.id || `world_${Date.now().toString(36)}`;
    SaveSystem.activeWorldName = saveData.name || 'Survival World';

    // Apply seed
    if (saveData.seed && world && world.seed !== saveData.seed) {
      world.seed = saveData.seed;
    }

    // Apply modified blocks
    if (saveData.modifiedBlocks && world) {
      world.modifiedBlocks = { ...saveData.modifiedBlocks };
    }

    // Apply inventory
    if (saveData.inventory && inventory) {
      inventory.loadState(saveData.inventory);
    }

    // Apply equipment
    if (saveData.equipment && inventory && inventory.equipment) {
      inventory.equipment = { ...saveData.equipment };
    }

    // Apply selected hotbar slot
    if (hotbar && saveData.selectedHotbarIndex !== undefined) {
      hotbar.selectedIndex = Math.max(0, Math.min(8, saveData.selectedHotbarIndex));
    }

    // Apply player position, rotation & stats
    if (saveData.player && player) {
      player.position.set(saveData.player.x, saveData.player.y, saveData.player.z);
      if (player.cameraController) {
        if (saveData.player.pitch !== undefined) {
          player.cameraController.pitch = saveData.player.pitch;
        }
        if (saveData.player.yaw !== undefined) {
          player.cameraController.yaw = saveData.player.yaw;
        }
      }
      if (player.stats) {
        if (saveData.player.health !== undefined) {
          player.stats.health = Math.max(0, Math.min(player.stats.maxHealth, saveData.player.health));
        }
        if (saveData.player.hunger !== undefined) {
          player.stats.hunger = Math.max(0, Math.min(player.stats.maxHunger, saveData.player.hunger));
        }
      }
    }

    // Apply time of day
    if (dayNightCycle && saveData.timeOfDay !== undefined) {
      dayNightCycle.timeOfDay = saveData.timeOfDay;
    }

    // Apply chests
    if (storageSystem && saveData.chests) {
      storageSystem.loadState(saveData.chests);
    }

    // Apply smelters
    if (smeltingSystem && saveData.smelters) {
      smeltingSystem.loadState(saveData.smelters);
    }

    // Apply crops
    if (farmingSystem && saveData.crops) {
      farmingSystem.loadState(saveData.crops);
    }

    // Apply item drops
    if (itemDropManager && saveData.itemDrops) {
      itemDropManager.loadState(saveData.itemDrops);
    }

    // Apply entities
    if (entityManager && saveData.entities && typeof entityManager.loadState === 'function') {
      entityManager.loadState(saveData.entities);
    }

    return true;
  }

  /**
   * Rename an existing world
   */
  static async renameWorld(id, newName) {
    if (!id || !newName) return false;
    const world = await SaveSystem.db.getWorld(id);
    if (!world) return false;

    world.name = newName.trim() || world.name;
    world.lastPlayedAt = Date.now();
    await SaveSystem.db.saveWorld(world);

    if (SaveSystem.activeWorldId === id) {
      SaveSystem.activeWorldName = world.name;
    }

    if (SaveSystem.fs.directoryHandle) {
      await SaveSystem.fs.syncWorldToDirectory(world);
    }

    return true;
  }

  /**
   * Duplicate an existing world
   */
  static async duplicateWorld(id) {
    if (!id) return null;
    const source = await SaveSystem.db.getWorld(id);
    if (!source) return null;

    const newId = `world_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicate = JSON.parse(JSON.stringify(source));
    duplicate.id = newId;
    duplicate.name = `${source.name} (Copy)`;
    duplicate.createdAt = Date.now();
    duplicate.lastPlayedAt = Date.now();

    await SaveSystem.db.saveWorld(duplicate);

    if (SaveSystem.fs.directoryHandle) {
      await SaveSystem.fs.syncWorldToDirectory(duplicate);
    }

    return duplicate;
  }

  /**
   * Delete an existing world
   */
  static async deleteWorld(id) {
    if (!id) return false;
    const success = await SaveSystem.db.deleteWorld(id);
    if (SaveSystem.activeWorldId === id) {
      SaveSystem.activeWorldId = null;
    }
    return success;
  }

  /**
   * Export world as downloadable file
   */
  static async exportWorld(id) {
    const world = await SaveSystem.db.getWorld(id);
    if (!world) throw new Error('World not found');
    return SaveSystem.fs.exportWorldAsFile(world);
  }

  /**
   * Get export package object for a world
   */
  static async getExportPackage(id) {
    const world = await SaveSystem.db.getWorld(id);
    if (!world) throw new Error('World not found');
    return SaveSystem.fs.createExportPackage(world);
  }

  /**
   * Get export package as JSON string
   */
  static async exportWorldJSON(id) {
    const pkg = await SaveSystem.getExportPackage(id);
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Import world from JSON string or file content
   */
  static async importWorld(jsonContent) {
    const worldRecord = SaveSystem.fs.parseImportedWorld(jsonContent);
    // Check if ID already exists, if so generate a new unique ID
    const existing = await SaveSystem.db.getWorld(worldRecord.id);
    if (existing) {
      worldRecord.id = `world_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      worldRecord.name = `${worldRecord.name} (Imported)`;
    }

    await SaveSystem.db.saveWorld(worldRecord);
    return worldRecord;
  }

  /**
   * Clear all world data (for tests/resets)
   */
  static async clearAllWorlds() {
    const worlds = await SaveSystem.listWorlds();
    for (const w of worlds) {
      await SaveSystem.deleteWorld(w.id);
    }
    localStorage.removeItem('blockworld_save_v4');
    localStorage.removeItem('blockworld_save_v3');
    localStorage.removeItem('blockworld_save_v2');
    localStorage.removeItem('blockworld_save_v1');
    SaveSystem.activeWorldId = null;
  }

  // Alias for backward compatibility
  static clear() {
    SaveSystem.clearAllWorlds();
  }

  static clearSave() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('blockworld_save_v4');
        localStorage.removeItem('blockworld_save_v3');
        localStorage.removeItem('blockworld_save_v2');
        localStorage.removeItem('blockworld_save_v1');
      }
    } catch (e) {}
    SaveSystem.activeWorldId = null;
    return SaveSystem.clearAllWorlds();
  }
}

if (typeof window !== 'undefined') {
  window.SaveSystem = SaveSystem;
}
