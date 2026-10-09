import { getBlockIdFromItem, ITEM_DEFINITIONS } from '../items/ItemTypes.js';

/**
 * 9-Slot Hotbar System for BlockWorld Version 3.
 * Links to player inventory slots 0-8.
 */
export class Hotbar {
  constructor(inventory) {
    this.inventory = inventory;
    this.slotCount = 9;
    this.selectedIndex = 0; // 0 to 8
    this.listeners = [];

    this._bindInput();
  }

  onSelect(callback) {
    this.listeners.push(callback);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  _notify() {
    for (const cb of this.listeners) {
      cb(this.selectedIndex, this.getSelectedItem());
    }
  }

  select(index) {
    if (index >= 0 && index < this.slotCount) {
      this.selectedIndex = index;
      this._notify();
    }
  }

  next() {
    this.selectedIndex = (this.selectedIndex + 1) % this.slotCount;
    this._notify();
  }

  prev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.slotCount) % this.slotCount;
    this._notify();
  }

  getSelectedSlot() {
    return this.inventory.getSlot(this.selectedIndex);
  }

  getSelectedItem() {
    const slot = this.getSelectedSlot();
    return slot ? slot.itemId : null;
  }

  getSelectedItemDefinition() {
    const itemId = this.getSelectedItem();
    return itemId ? ITEM_DEFINITIONS[itemId] : null;
  }

  getSelectedBlockId() {
    const itemId = this.getSelectedItem();
    return itemId ? getBlockIdFromItem(itemId) : null;
  }

  getSelectedBlock() {
    return this.getSelectedBlockId();
  }

  consumeSelectedBlock() {
    const slot = this.getSelectedSlot();
    if (slot) {
      if (slot.count > 1) {
        slot.count--;
        this.inventory._notify({ type: 'update', index: this.selectedIndex, slot });
      } else {
        this.inventory.setItemAt(this.selectedIndex, null, 0);
      }
    }
  }

  damageActiveTool(amount = 1) {
    return this.inventory.damageToolInSlot(this.selectedIndex, amount);
  }

  _bindInput() {
    if (typeof window === 'undefined') return;

    // Number keys 1-9
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= this.slotCount) {
        this.select(num - 1);
      }
    });

    // Mouse wheel cycling
    window.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.next();
      } else if (e.deltaY < 0) {
        this.prev();
      }
    }, { passive: true });
  }
}

