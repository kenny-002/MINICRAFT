/**
 * FileSystemAdapter for MINICRAFT Worlds.
 * Uses the File System Access API (when supported and user-granted)
 * to synchronize separate structured JSON files into a physical "MINICRAFT Worlds/World_X/" folder structure.
 * Provides portable export/import capabilities as JSON archives.
 */
export class FileSystemAdapter {
  constructor() {
    this.directoryHandle = null;
    this.isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Check if File System Access API is supported in current browser
   */
  hasFileSystemSupport() {
    return this.isSupported;
  }

  /**
   * Request user to select or create their "MINICRAFT Worlds" folder.
   * MUST be called from an explicit user gesture (button click).
   */
  async selectWorldsDirectory() {
    if (!this.isSupported) {
      throw new Error('File System Access API is not supported in this browser. IndexedDB is used as the primary storage.');
    }

    try {
      const handle = await window.showDirectoryPicker({
        id: 'minicraft_worlds_root',
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Verify readwrite permission
      const perm = await this._verifyPermission(handle, true);
      if (!perm) {
        throw new Error('Permission to write to the selected folder was denied.');
      }

      this.directoryHandle = handle;
      return { success: true, name: handle.name };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, aborted: true };
      }
      console.warn('Directory selection failed:', err);
      return { success: false, error: err.message };
    }
  }

  async _verifyPermission(fileHandle, readWrite = true) {
    const options = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }

  /**
   * Synchronize / write structured world files into the user's selected folder:
   * MINICRAFT Worlds/
   *   World_<id>/
   *     metadata.json
   *     world.json
   *     player.json
   *     inventory.json
   *     entities.json
   *     item_drops.json
   */
  async syncWorldToDirectory(worldRecord) {
    if (!this.directoryHandle || !worldRecord || !worldRecord.id) return false;

    try {
      // 1. Sanitize folder name: e.g. "World_Alpine_Seed" or "World_<id>"
      const safeName = (worldRecord.name || 'World')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .substring(0, 32);
      const folderName = `${safeName}_${worldRecord.id.substring(0, 8)}`;

      // 2. Get or create subfolder
      const worldDirHandle = await this.directoryHandle.getDirectoryHandle(folderName, { create: true });

      // 3. Write individual structured files
      await this._writeFile(worldDirHandle, 'metadata.json', {
        id: worldRecord.id,
        name: worldRecord.name,
        seed: worldRecord.seed,
        createdAt: worldRecord.createdAt,
        lastPlayedAt: worldRecord.lastPlayedAt,
        playtime: worldRecord.playtime || 0,
        worldVersion: worldRecord.worldVersion || 6,
      });

      await this._writeFile(worldDirHandle, 'world.json', {
        seed: worldRecord.seed,
        modifiedBlocks: worldRecord.world?.modifiedBlocks || worldRecord.modifiedBlocks || {},
        timeOfDay: worldRecord.world?.timeOfDay !== undefined ? worldRecord.world.timeOfDay : worldRecord.timeOfDay || 0.25,
        chests: worldRecord.world?.chests || worldRecord.chests || {},
        smelters: worldRecord.world?.smelters || worldRecord.smelters || {},
        crops: worldRecord.world?.crops || worldRecord.crops || {},
      });

      await this._writeFile(worldDirHandle, 'player.json', worldRecord.player || {
        x: 0,
        y: 15,
        z: 0,
        pitch: 0,
        yaw: 0,
        health: 100,
        hunger: 100,
      });

      await this._writeFile(worldDirHandle, 'inventory.json', {
        selectedHotbarIndex: worldRecord.selectedHotbarIndex || 0,
        slots: worldRecord.inventory || [],
        equipment: worldRecord.equipment || {},
      });

      await this._writeFile(worldDirHandle, 'entities.json', {
        mobs: worldRecord.entities || [],
      });

      await this._writeFile(worldDirHandle, 'item_drops.json', {
        itemDrops: worldRecord.itemDrops || [],
      });

      return true;
    } catch (err) {
      console.warn('Failed to sync world to physical directory:', err);
      return false;
    }
  }

  async _writeFile(dirHandle, filename, dataObj) {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(dataObj, null, 2));
    await writable.close();
  }

  /**
  /**
   * Create structured export package
   */
  createExportPackage(worldRecord) {
    if (!worldRecord) return null;

    return {
      format: 'MINICRAFT_WORLD_ARCHIVE',
      schemaVersion: 6,
      exportedAt: Date.now(),
      manifest: {
        id: worldRecord.id,
        name: worldRecord.name,
        seed: worldRecord.seed,
        createdAt: worldRecord.createdAt,
        lastPlayedAt: worldRecord.lastPlayedAt,
      },
      files: {
        'metadata.json': {
          id: worldRecord.id,
          name: worldRecord.name,
          seed: worldRecord.seed,
          createdAt: worldRecord.createdAt,
          lastPlayedAt: worldRecord.lastPlayedAt,
          playtime: worldRecord.playtime || 0,
          worldVersion: worldRecord.worldVersion || 6,
        },
        'world.json': {
          seed: worldRecord.seed,
          modifiedBlocks: worldRecord.modifiedBlocks || worldRecord.world?.modifiedBlocks || {},
          timeOfDay: worldRecord.timeOfDay || worldRecord.world?.timeOfDay || 0.25,
          chests: worldRecord.chests || worldRecord.world?.chests || {},
          smelters: worldRecord.smelters || worldRecord.world?.smelters || {},
          crops: worldRecord.crops || worldRecord.world?.crops || {},
        },
        'player.json': worldRecord.player || {},
        'inventory.json': {
          selectedHotbarIndex: worldRecord.selectedHotbarIndex || 0,
          slots: worldRecord.inventory || [],
          equipment: worldRecord.equipment || {},
        },
        'entities.json': {
          mobs: worldRecord.entities || [],
        },
        'item_drops.json': {
          itemDrops: worldRecord.itemDrops || [],
        },
      },
      rawWorld: worldRecord,
    };
  }

  /**
   * Export world data bundle as a portable downloadable file
   */
  exportWorldAsFile(worldRecord) {
    const exportPackage = this.createExportPackage(worldRecord);
    if (!exportPackage) return false;

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (worldRecord.name || 'World').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.href = url;
    a.download = `MINICRAFT_${safeName}_${worldRecord.seed}.minicraft.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);

    return true;
  }

  /**
   * Parse and validate imported world file/json
   */
  parseImportedWorld(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

      // Case 1: Structured export archive
      if (data.format === 'MINICRAFT_WORLD_ARCHIVE' && data.rawWorld) {
        const raw = data.rawWorld;
        return this._sanitizeWorldRecord(raw);
      }

      // Case 2: Direct raw world record
      if (data.id && data.seed) {
        return this._sanitizeWorldRecord(data);
      }

      // Case 3: Legacy BlockWorld V1-V4 single world format
      if (data.worldVersion || data.seed) {
        return this._sanitizeWorldRecord({
          id: `world_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          name: 'Imported World',
          seed: data.seed || 'Minicraft-Seed-1',
          createdAt: data.savedAt || Date.now(),
          lastPlayedAt: Date.now(),
          worldVersion: data.worldVersion || 4,
          ...data,
        });
      }

      throw new Error('Unrecognized save format. Ensure the file was exported from MINICRAFT or BlockWorld.');
    } catch (err) {
      console.error('Import parse error:', err);
      throw new Error(`Failed to parse world save: ${err.message}`);
    }
  }

  _sanitizeWorldRecord(raw) {
    const id = raw.id || `world_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const name = raw.name || `World ${raw.seed || '1'}`;
    const seed = raw.seed || 'Minicraft-Seed-1';

    return {
      id,
      name,
      seed,
      createdAt: raw.createdAt || Date.now(),
      lastPlayedAt: raw.lastPlayedAt || Date.now(),
      playtime: raw.playtime || 0,
      worldVersion: 6,
      modifiedBlocks: raw.modifiedBlocks || raw.world?.modifiedBlocks || {},
      timeOfDay: raw.timeOfDay !== undefined ? raw.timeOfDay : (raw.world?.timeOfDay !== undefined ? raw.world.timeOfDay : 0.25),
      player: raw.player || {
        x: 0,
        y: 15,
        z: 0,
        pitch: 0,
        yaw: 0,
        health: 100,
        hunger: 100,
        isDead: false,
      },
      selectedHotbarIndex: raw.selectedHotbarIndex || 0,
      inventory: raw.inventory || raw.slots || new Array(36).fill(null),
      equipment: raw.equipment || { head: null, chest: null, legs: null, feet: null },
      chests: raw.chests || raw.world?.chests || {},
      smelters: raw.smelters || raw.world?.smelters || {},
      crops: raw.crops || raw.world?.crops || {},
      itemDrops: raw.itemDrops || [],
      entities: raw.entities || [],
    };
  }
}
