import { ItemRegistry } from '../items/ItemTypes.js';

/**
 * 27-slot Container inventory for Storage Chests in BlockWorld Version 4.
 */
export class Chest {
  constructor(x, y, z, slotCount = 27) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.slotCount = slotCount;
    this.slots = new Array(slotCount).fill(null);
  }

  getSlot(index) {
    if (index < 0 || index >= this.slotCount) return null;
    return this.slots[index];
  }

  setSlot(index, itemId, count = 1, durability = null) {
    if (index < 0 || index >= this.slotCount) return false;

    if (!itemId || count <= 0) {
      this.slots[index] = null;
      return true;
    }

    const def = ItemRegistry.get(itemId);
    const maxDur = def && def.durability ? def.durability : null;

    this.slots[index] = {
      itemId,
      count: Math.min(count, def ? def.maxStack || 64 : 64),
      durability: durability !== null ? durability : maxDur,
      maxDurability: maxDur,
    };
    return true;
  }

  addItem(itemId, count = 1, durability = null) {
    const def = ItemRegistry.get(itemId);
    if (!def) return 0;

    const maxStack = def.maxStack || 64;
    let remaining = count;

    // 1. Fill existing matching stacks
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

    // 2. Fill first empty slots
    if (remaining > 0) {
      for (let i = 0; i < this.slotCount; i++) {
        if (!this.slots[i]) {
          const addAmount = Math.min(remaining, maxStack);
          this.slots[i] = {
            itemId,
            count: addAmount,
            durability: durability !== null ? durability : (def.durability || null),
            maxDurability: def.durability || null,
          };
          remaining -= addAmount;
          if (remaining <= 0) break;
        }
      }
    }

    return count - remaining;
  }

  removeItem(itemId, count = 1) {
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
    return needed === 0;
  }

  getAllItems() {
    return this.slots
      .map((slot, index) => (slot ? { slot: index, ...slot } : null))
      .filter((s) => s !== null);
  }

  loadItems(itemsArray) {
    this.slots.fill(null);
    if (!itemsArray) return;
    for (const item of itemsArray) {
      if (item && item.slot >= 0 && item.slot < this.slotCount) {
        this.slots[item.slot] = {
          itemId: item.itemId,
          count: item.count,
          durability: item.durability || null,
          maxDurability: item.maxDurability || null,
        };
      }
    }
  }
}
