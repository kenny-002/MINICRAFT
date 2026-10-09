import { Chest } from './Chest.js';

/**
 * World-wide Chest Storage Manager for BlockWorld Version 4.
 */
export class StorageSystem {
  constructor() {
    this.chests = new Map(); // key: 'x,y,z' -> Chest
    this.openChest = null;
  }

  getChest(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!this.chests.has(key)) {
      this.chests.set(key, new Chest(x, y, z));
    }
    return this.chests.get(key);
  }

  removeChest(x, y, z) {
    const key = `${x},${y},${z}`;
    const chest = this.chests.get(key);
    let items = [];
    if (chest) {
      items = chest.getAllItems();
      this.chests.delete(key);
    }
    return items;
  }

  saveState() {
    const data = {};
    for (const [key, chest] of this.chests.entries()) {
      data[key] = {
        x: chest.x,
        y: chest.y,
        z: chest.z,
        items: chest.getAllItems(),
      };
    }
    return data;
  }

  loadState(data) {
    this.chests.clear();
    if (!data) return;
    for (const [key, chestData] of Object.entries(data)) {
      const chest = new Chest(chestData.x, chestData.y, chestData.z);
      chest.loadItems(chestData.items);
      this.chests.set(key, chest);
    }
  }
}
