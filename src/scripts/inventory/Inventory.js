import { BLOCK } from '../blocks/BlockTypes.js';
import { ITEMS, ITEM_DEFINITIONS, getItemIdFromBlock, getBlockIdFromItem } from '../items/ItemTypes.js';

/**
 * Universal Item Inventory & Equipment System for BlockWorld Version 3.
 * Manages stackable items, tools with individual durability, equipment slots,
 * and hotbar assignments.
 */
export class Inventory {
  constructor(slotCount = 36) {
    this.slotCount = slotCount;
    this.slots = new Array(slotCount).fill(null); // Array of { itemId, count, durability, maxDurability } or null
    this.equipment = {
      head: null,
      chest: null,
      legs: null,
      feet: null,
    };

    this.listeners = [];
  }

  clearAll() {
    this.slots = new Array(this.slotCount).fill(null);
    this.equipment = {
      head: null,
      chest: null,
      legs: null,
      feet: null,
    };
    this._notify({ type: 'clear_all' });
  }

  setEquipment(slot, itemId, durability = null) {
    if (!this.equipment.hasOwnProperty(slot)) {
      // Map alias names if needed
      if (slot === 'helmet') slot = 'head';
      if (slot === 'chestplate') slot = 'chest';
      if (slot === 'leggings') slot = 'legs';
      if (slot === 'boots') slot = 'feet';
    }
    if (!this.equipment.hasOwnProperty(slot)) return false;

    if (!itemId) {
      this.equipment[slot] = null;
    } else {
      const def = ITEM_DEFINITIONS[itemId];
      const maxDur = def && def.durability ? def.durability : null;
      this.equipment[slot] = {
        itemId,
        durability: durability !== null ? durability : maxDur,
        maxDurability: maxDur,
      };
    }
    this._notify({ type: 'equipment', slot, item: this.equipment[slot] });
    return true;
  }

  getEquipment(slot) {
    if (!this.equipment.hasOwnProperty(slot)) {
      if (slot === 'helmet') slot = 'head';
      if (slot === 'chestplate') slot = 'chest';
      if (slot === 'leggings') slot = 'legs';
      if (slot === 'boots') slot = 'feet';
    }
    return this.equipment[slot] || null;
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  _notify(event = {}) {
    for (const cb of this.listeners) {
      cb(this, event);
    }
  }

  getSlot(index) {
    if (index < 0 || index >= this.slotCount) return null;
    return this.slots[index];
  }

  setItemAt(index, itemId, count = 1, durability = null) {
    if (index < 0 || index >= this.slotCount) return false;

    if (!itemId || count <= 0) {
      this.slots[index] = null;
      this._notify({ type: 'clear', index });
      return true;
    }

    const def = ITEM_DEFINITIONS[itemId];
    const maxDur = def && def.durability ? def.durability : null;
    const curDur = durability !== null ? durability : maxDur;

    this.slots[index] = {
      itemId,
      count: Math.min(count, def ? def.maxStack || 64 : 64),
      durability: curDur,
      maxDurability: maxDur,
    };

    this._notify({ type: 'set', index, item: this.slots[index] });
    return true;
  }

  setSlot(index, itemId, count = 1, durability = null) {
    return this.setItemAt(index, itemId, count, durability);
  }

  /**
   * Adds an item to the inventory (stacking with existing slots or finding first empty)
   */
  addItem(itemIdOrBlockId, count = 1, durability = null) {
    let itemId = itemIdOrBlockId;
    if (typeof itemIdOrBlockId === 'number') {
      itemId = getItemIdFromBlock(itemIdOrBlockId);
    }
    if (!itemId) return 0;

    const def = ITEM_DEFINITIONS[itemId];
    if (!def) return 0;

    const maxStack = def.maxStack || 64;
    let remaining = count;

    // 1. If stackable (maxStack > 1 and not a tool with custom durability), fill existing slots
    if (maxStack > 1 && !def.durability) {
      for (let i = 0; i < this.slotCount; i++) {
        const slot = this.slots[i];
        if (slot && slot.itemId === itemId && slot.count < maxStack) {
          const addAmount = Math.min(remaining, maxStack - slot.count);
          slot.count += addAmount;
          remaining -= addAmount;
          if (remaining <= 0) break;
        }
      }
    }

    // 2. Put remaining in first empty slots
    if (remaining > 0) {
      for (let i = 0; i < this.slotCount; i++) {
        if (!this.slots[i]) {
          const addAmount = Math.min(remaining, maxStack);
          const maxDur = def.durability || null;
          const curDur = durability !== null ? durability : maxDur;

          this.slots[i] = {
            itemId,
            count: addAmount,
            durability: curDur,
            maxDurability: maxDur,
          };
          remaining -= addAmount;
          if (remaining <= 0) break;
        }
      }
    }

    this._notify({ type: 'add', itemId, addedCount: count - remaining });
    return count - remaining;
  }

  /**
   * Removes count of item from inventory
   */
  removeItem(itemIdOrBlockId, count = 1) {
    let itemId = itemIdOrBlockId;
    if (typeof itemIdOrBlockId === 'number') {
      itemId = getItemIdFromBlock(itemIdOrBlockId);
    }
    if (!itemId || count <= 0) return false;

    if (this.getItemCount(itemId) < count) return false;

    let needed = count;
    for (let i = this.slotCount - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        if (slot.count <= needed) {
          needed -= slot.count;
          this.slots[i] = null;
        } else {
          slot.count -= needed;
          needed = 0;
        }
        if (needed <= 0) break;
      }
    }

    this._notify({ type: 'remove', itemId, count });
    return true;
  }

  /**
   * Reduces durability of tool in specific slot
   * Returns true if tool broke
   */
  damageToolInSlot(index, amount = 1) {
    const slot = this.getSlot(index);
    if (!slot || slot.durability === null) return false;

    slot.durability -= amount;
    if (slot.durability <= 0) {
      this.slots[index] = null; // Broken!
      this._notify({ type: 'tool_broken', index, itemId: slot.itemId });
      return true;
    }

    this._notify({ type: 'durability_change', index, slot });
    return false;
  }

  reduceDurability(index, amount = 1) {
    return this.damageToolInSlot(index, amount);
  }

  hasItem(itemIdOrBlockId, count = 1) {
    return this.getItemCount(itemIdOrBlockId) >= count;
  }

  findItemSlot(itemIdOrBlockId) {
    let itemId = itemIdOrBlockId;
    if (typeof itemIdOrBlockId === 'number') {
      itemId = getItemIdFromBlock(itemIdOrBlockId);
    }
    for (let i = 0; i < this.slotCount; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) {
        return i;
      }
    }
    return -1;
  }

  getItemCount(itemIdOrBlockId) {
    let itemId = itemIdOrBlockId;
    if (typeof itemIdOrBlockId === 'number') {
      itemId = getItemIdFromBlock(itemIdOrBlockId);
    }
    if (!itemId) return 0;

    let total = 0;
    for (let i = 0; i < this.slotCount; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  swapSlots(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.slotCount || toIndex < 0 || toIndex >= this.slotCount) return;
    const temp = this.slots[fromIndex];
    this.slots[fromIndex] = this.slots[toIndex];
    this.slots[toIndex] = temp;
    this._notify({ type: 'swap', fromIndex, toIndex });
  }

  getAllItems() {
    return this.slots.map((slot, index) => ({
      slotIndex: index,
      item: slot ? { ...slot } : null,
    }));
  }

  loadState(savedItems) {
    this.slots = new Array(this.slotCount).fill(null);

    if (Array.isArray(savedItems)) {
      for (const entry of savedItems) {
        if (entry.slotIndex !== undefined && entry.item) {
          this.slots[entry.slotIndex] = { ...entry.item };
        } else if (entry.blockId !== undefined) {
          // Version 1 / 2 migration format
          const itemId = getItemIdFromBlock(entry.blockId);
          if (itemId) {
            this.addItem(itemId, entry.count || 1);
          }
        } else if (entry.itemId !== undefined) {
          this.addItem(entry.itemId, entry.count || 1, entry.durability);
        }
      }
    } else if (typeof savedItems === 'object') {
      for (const [key, val] of Object.entries(savedItems)) {
        const blockId = parseInt(key, 10);
        const itemId = getItemIdFromBlock(blockId);
        if (itemId) {
          this.addItem(itemId, typeof val === 'number' ? val : val.count);
        }
      }
    }

    this._notify({ type: 'load' });
  }
}


