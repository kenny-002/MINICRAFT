/**
 * Achievement and Progression Tracking System for MINICRAFT.
 * Tracks milestones and rewards player achievements with notifications.
 */
export class AchievementSystem {
  static STORAGE_KEY = 'minicraft_achievements_v1';

  static DEFINITIONS = [
    {
      id: 'taking_inventory',
      title: 'Taking Inventory',
      desc: 'Open your survival inventory with the E key.',
      icon: '🎒',
      category: 'GENERAL',
    },
    {
      id: 'getting_wood',
      title: 'Getting Wood',
      desc: 'Punch or chop wood logs from a forest tree.',
      icon: '🪵',
      category: 'GATHERING',
    },
    {
      id: 'benchmarking',
      title: 'Benchmarking',
      desc: 'Construct a 3x3 Crafting Bench from wooden planks.',
      icon: '🔨',
      category: 'CRAFTING',
    },
    {
      id: 'stone_age',
      title: 'Stone Age',
      desc: 'Mine stone or cobble with your wooden pickaxe.',
      icon: '🪨',
      category: 'MINING',
    },
    {
      id: 'hot_topic',
      title: 'Hot Topic',
      desc: 'Construct and use a Charcoal Smelter to smelt materials.',
      icon: '🔥',
      category: 'SMELTING',
    },
    {
      id: 'time_to_strike',
      title: 'Time to Strike!',
      desc: 'Craft a sharp wooden or iron sword for combat.',
      icon: '⚔️',
      category: 'COMBAT',
    },
    {
      id: 'monster_hunter',
      title: 'Monster Hunter',
      desc: 'Attack and defeat a hostile zombie in combat.',
      icon: '🧟',
      category: 'COMBAT',
    },
    {
      id: 'bake_bread',
      title: 'Master Farmer',
      desc: 'Till fertile soil, plant seeds, and harvest crops.',
      icon: '🌾',
      category: 'FARMING',
    },
    {
      id: 'suit_up',
      title: 'Suit Up',
      desc: 'Equip any piece of crafted protective armor.',
      icon: '🛡️',
      category: 'ARMOR',
    },
    {
      id: 'chest_storage',
      title: 'Pack Mule',
      desc: 'Craft and place a wooden storage chest.',
      icon: '📦',
      category: 'STORAGE',
    },
  ];

  constructor(game) {
    this.game = game;
    this.unlocked = {};
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(AchievementSystem.STORAGE_KEY);
      if (raw) {
        this.unlocked = JSON.parse(raw);
      }
    } catch (e) {
      this.unlocked = {};
    }
  }

  save() {
    try {
      localStorage.setItem(AchievementSystem.STORAGE_KEY, JSON.stringify(this.unlocked));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }

  unlock(achievementId) {
    if (this.unlocked[achievementId]) return false; // Already unlocked

    const def = AchievementSystem.DEFINITIONS.find((a) => a.id === achievementId);
    if (!def) return false;

    this.unlocked[achievementId] = {
      unlockedAt: Date.now(),
    };
    this.save();

    // Play achievement audio and show toast
    if (this.game) {
      if (this.game.sound && typeof this.game.sound.playLevelUp === 'function') {
        this.game.sound.playLevelUp();
      }
      if (this.game.ui && typeof this.game.ui.showToast === 'function') {
        this.game.ui.showToast(`🏆 Achievement Unlocked: ${def.title}!`, 4500);
      }
    }

    return true;
  }

  isUnlocked(achievementId) {
    return !!this.unlocked[achievementId];
  }

  getUnlockedCount() {
    return Object.keys(this.unlocked).length;
  }

  getAll() {
    return AchievementSystem.DEFINITIONS.map((def) => ({
      ...def,
      unlocked: !!this.unlocked[def.id],
      unlockedAt: this.unlocked[def.id]?.unlockedAt || null,
    }));
  }

  reset() {
    this.unlocked = {};
    this.save();
  }
}
