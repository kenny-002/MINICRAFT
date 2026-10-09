import { BLOCK } from '../blocks/BlockTypes.js';
import { ITEMS, ITEM_DEFINITIONS, ITEM_CATEGORY, EQUIPMENT_SLOT, ItemRegistry, TOOL_TYPES } from '../items/ItemTypes.js';
import { RECIPES, getRecipesByCategory } from '../crafting/RecipeRegistry.js';
import { SaveSystem } from '../save/SaveSystem.js';
import { ArmorSystem } from '../armor/ArmorSystem.js';
import { isFuel, getSmeltingRecipe } from '../smelting/SmeltingRecipes.js';
import { PixelIconGenerator } from './PixelIconGenerator.js';
import { PlayerPreviewRenderer } from './PlayerPreviewRenderer.js';
import { AchievementSystem } from './AchievementSystem.js';
import { SettingsSystem } from './SettingsSystem.js';

export const APP_STATE = {
  SPLASH: 'splash',
  MAIN_MENU: 'mainMenu',
  WORLD_SELECT: 'worldSelection',
  ACHIEVEMENTS: 'achievements',
  SETTINGS: 'settings',
  STORE: 'store',
  PLAYING: 'playing',
  PAUSED: 'paused',
  DEAD: 'dead',
};

/**
 * UIManager for MINICRAFT Version 6.0.
 * Handles MINI COMPANY Startup Splash Screen, MINICRAFT 3D Main Menu,
 * World Selection, Achievements Screen, Settings & Preferences,
 * Store Previews, Survival Inventory, Crafting, Smelting, Chests, and HUD.
 */
export class UIManager {
  constructor(game) {
    this.game = game;

    this.debugVisible = false;
    this.inventoryOpen = false;
    this.craftingOpen = false;
    this.smelterOpen = false;
    this.chestOpen = false;
    this.deathOpen = false;
    this.pauseOpen = false;
    this.worldSelectOpen = false;
    this.achievementsOpen = false;
    this.settingsOpen = false;
    this.storeOpen = false;
    this.deleteConfirmOpen = false;
    this.settingsOpenedFromPause = false;
    this.activeCraftCategory = 'ALL';

    this.activeSmelter = null;
    this.activeChest = null;

    // Subsystems
    this.achievements = new AchievementSystem(this.game);
    this.settings = new SettingsSystem(this.game);

    // Procedural Pixel Icon Generator
    this.iconGenerator = new PixelIconGenerator(this.game.world.textureAtlas);

    // Floating Cursor Held Stack State
    this.heldItem = null; // { itemId, count, durability, maxDurability } or null
    this.fieldCraftSlots = [null, null, null, null]; // 2x2 grid slots
    this.fieldCraftOutput = null; // { recipe, output: { itemId, count } } or null

    // Flame animation timer for smelter
    this.flameFrame = 0;
    this.flameTimer = 0;

    // DOM Elements - Splash & Main Menu
    this.splashScreen = document.getElementById('mini-company-splash');
    this.splashDismissed = false;
    this.startScreen = document.getElementById('start-screen');
    this.btnMenuPlay = document.getElementById('btn-menu-play');
    this.btnMenuAchievements = document.getElementById('btn-menu-achievements');
    this.btnMenuSettings = document.getElementById('btn-menu-settings');
    this.btnMenuStore = document.getElementById('btn-menu-store');

    // DOM Elements - Sub-Screens
    this.worldSelectModal = document.getElementById('world-select-modal');
    this.achievementsModal = document.getElementById('achievements-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.storeModal = document.getElementById('store-modal');
    this.deleteConfirmModal = document.getElementById('delete-confirm-modal');

    // DOM Elements - In-Game Modals & HUD
    this.container = document.getElementById('ui-container');
    this.hotbarElement = document.getElementById('hotbar');
    this.inventoryModal = document.getElementById('inventory-modal');
    this.craftingModal = document.getElementById('crafting-modal');
    this.smelterModal = document.getElementById('smelter-modal');
    this.chestModal = document.getElementById('chest-modal');
    this.deathModal = document.getElementById('death-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.deathCauseText = document.getElementById('death-cause-text');
    this.btnRespawn = document.getElementById('btn-respawn');
    this.btnDeathMenu = document.getElementById('btn-death-menu');

    this.debugPanel = document.getElementById('debug-panel');
    this.toastElement = document.getElementById('toast');
    this.miningProgressBar = document.getElementById('mining-progress-bar');
    this.farmingTooltip = document.getElementById('farming-tooltip');
    this.hurtOverlay = document.getElementById('hurt-overlay');

    this.heartsContainer = document.getElementById('hud-hearts-container');
    this.hungerContainer = document.getElementById('hud-hunger-container');
    this.xpFill = document.getElementById('hud-xp-fill');

    this.totalDefenseBadge = document.getElementById('total-defense-badge');
    this.recipeListContainer = document.getElementById('recipe-list-container');
    this.craftingBenchBanner = document.getElementById('crafting-bench-banner');
    this.craftingModalTitle = document.getElementById('crafting-modal-title');

    // Floating UI Elements
    this.cursorFloat = document.getElementById('cursor-item-float');
    this.cursorIcon = document.getElementById('cursor-item-icon');
    this.cursorCount = document.getElementById('cursor-item-count');
    this.pixelTooltip = document.getElementById('pixel-tooltip');

    // DOM Elements - Multi-World & Storage
    this.renameModal = document.getElementById('rename-world-modal');
    this.inputWorldName = document.getElementById('input-world-name');
    this.inputRenameWorld = document.getElementById('input-rename-world');
    this.btnConfirmRenameWorld = document.getElementById('btn-confirm-rename-world');
    this.btnCancelRenameWorld = document.getElementById('btn-cancel-rename-world');
    this.btnSyncFolder = document.getElementById('btn-sync-folder');
    this.btnImportWorld = document.getElementById('btn-import-world');
    this.inputImportWorld = document.getElementById('input-import-world');
    this.savingIndicator = document.getElementById('saving-indicator');
    this.targetDeleteWorldId = null;
    this.targetRenameWorldId = null;

    // Save System Indicator Hook
    SaveSystem.onSaveStateChange = (isSaving, timestamp) => {
      if (this.savingIndicator) {
        if (isSaving) {
          this.savingIndicator.style.display = 'flex';
        } else {
          setTimeout(() => {
            if (this.savingIndicator && !SaveSystem.isSaving) {
              this.savingIndicator.style.display = 'none';
            }
          }, 800);
        }
      }
    };

    this.seedInput = document.getElementById('input-seed');
    this.btnRandomSeed = document.getElementById('btn-random-seed');
    this.btnCreateNewWorld = document.getElementById('btn-create-new-world');

    // Pause Menu Buttons
    this.btnPauseResume = document.getElementById('btn-pause-resume');
    this.btnPauseSave = document.getElementById('btn-pause-save');
    this.btnPauseSettings = document.getElementById('btn-pause-settings');
    this.btnPauseSeed = document.getElementById('btn-pause-seed');
    this.btnPauseMainMenu = document.getElementById('btn-pause-main-menu');

    // 3D Player Character Preview Renderer
    const previewCanvas = document.getElementById('player-preview-canvas');
    if (previewCanvas) {
      this.playerPreview = new PlayerPreviewRenderer(previewCanvas);
    }

    this.fpsCount = 0;
    this.fpsTimer = 0;
    this.currentFps = 60;
    this.frameTimeMs = 16.6;

    this.createHotbar();
    this._initVitalsHUD();
    this._initSplashLifecycle();
    this._bindEvents();
    this._updateMenuState();
    this._updateSurvivalBars();
  }

  // ============================================================
  // REUSABLE UI COMPONENT ARCHITECTURE (Requirement 29)
  // ============================================================

  /**
   * Creates a reusable square pixel slot element
   */
  createPixelSlot(index, options = {}) {
    const isHotbar = options.isHotbar || false;
    const isChest = options.isChest || false;
    const slotData = isChest
      ? (this.activeChest ? this.activeChest.getSlot(index) : null)
      : this.game.inventory.getSlot(index);

    const slot = document.createElement('div');
    slot.className = `pixel-slot ${slotData ? 'has-item' : ''} ${isHotbar && index === this.game.hotbar.selectedIndex ? 'selected' : ''}`;
    slot.dataset.index = index;

    if (isHotbar) {
      const keyTag = document.createElement('span');
      keyTag.className = 'slot-key';
      keyTag.innerText = `${index + 1}`;
      slot.appendChild(keyTag);
    }

    this.updateInventorySlot(slot, slotData);

    if (isChest) {
      slot.addEventListener('mousedown', (e) => this._handleChestSlotClick(index, e));
    } else {
      slot.addEventListener('mousedown', (e) => this._handleInventorySlotClick(index, e));
    }

    return slot;
  }

  /**
   * Alias for backward compatibility
   */
  createInventorySlot(index, options = {}) {
    return this.createPixelSlot(index, options);
  }

  /**
   * Creates a pixel-art item icon image
   */
  createItemIcon(itemId) {
    if (!itemId) return null;
    const def = ItemRegistry.get(itemId);
    const img = document.createElement('img');
    img.className = 'slot-icon-img';
    img.src = this.iconGenerator.getIconUrl(itemId);
    img.alt = def ? def.name : itemId;
    img.draggable = false;
    return img;
  }

  /**
   * Updates an existing slot element with new slot data
   */
  updateInventorySlot(slotElement, slotData) {
    if (!slotElement) return;

    // Preserve slot-key if hotbar
    const keyEl = slotElement.querySelector('.slot-key');
    slotElement.innerHTML = '';
    if (keyEl) slotElement.appendChild(keyEl);

    if (slotData && slotData.itemId) {
      const def = ItemRegistry.get(slotData.itemId);
      const iconImg = this.createItemIcon(slotData.itemId);
      if (iconImg) slotElement.appendChild(iconImg);

      if (slotData.count > 1) {
        this.updateStackCount(slotElement, slotData.count);
      }

      if (slotData.durability !== null && slotData.maxDurability) {
        this.updateDurability(slotElement, slotData.durability, slotData.maxDurability);
      }

      slotElement.classList.add('has-item');
      this._attachTooltipEvents(slotElement, slotData, def);
    } else {
      slotElement.classList.remove('has-item');
    }
  }

  /**
   * Updates stack count text inside a slot
   */
  updateStackCount(slotElement, count) {
    if (!slotElement) return;
    let countEl = slotElement.querySelector('.slot-count');
    if (count > 1) {
      if (!countEl) {
        countEl = document.createElement('span');
        countEl.className = 'slot-count';
        slotElement.appendChild(countEl);
      }
      countEl.innerText = `${count}`;
    } else if (countEl) {
      countEl.remove();
    }
  }

  /**
   * Updates durability bar inside a slot
   */
  updateDurability(slotElement, durability, maxDurability) {
    if (!slotElement || durability === null || !maxDurability) return;

    let durBar = slotElement.querySelector('.durability-bar');
    if (!durBar) {
      durBar = document.createElement('div');
      durBar.className = 'durability-bar';
      const durFill = document.createElement('div');
      durFill.className = 'durability-fill';
      durBar.appendChild(durFill);
      slotElement.appendChild(durBar);
    }

    const pct = Math.max(0, Math.min(100, (durability / maxDurability) * 100));
    const durFill = durBar.querySelector('.durability-fill');
    if (durFill) {
      durFill.style.width = `${pct}%`;
      durFill.className = `durability-fill ${pct < 25 ? 'low' : pct < 55 ? 'med' : ''}`;
    }
  }

  /**
   * Creates / displays tooltip on client coordinates
   */
  createTooltip(slotData, def, clientX, clientY) {
    this._showTooltip(slotData, def, clientX, clientY);
  }

  // ============================================================
  // GAMEPLAY HUD & VITALS (Hearts, Hunger, XP, Hotbar)
  // ============================================================
  _initVitalsHUD() {
    // 10 Pixel Hearts
    if (this.heartsContainer) {
      this.heartsContainer.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const heart = document.createElement('img');
        heart.className = 'pixel-heart';
        heart.src = this.iconGenerator.getHeartIconUrl('full');
        heart.dataset.index = i;
        this.heartsContainer.appendChild(heart);
      }
    }

    // 10 Pixel Hunger Units
    if (this.hungerContainer) {
      this.hungerContainer.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const hunger = document.createElement('img');
        hunger.className = 'pixel-food-unit';
        hunger.src = this.iconGenerator.getHungerIconUrl('full');
        hunger.dataset.index = i;
        this.hungerContainer.appendChild(hunger);
      }
    }
  }

  createHotbar() {
    if (!this.hotbarElement) return;
    this.hotbarElement.innerHTML = '';

    for (let index = 0; index < 9; index++) {
      const slotData = this.game.inventory.getSlot(index);
      const def = slotData ? ItemRegistry.get(slotData.itemId) : null;

      const slot = document.createElement('div');
      slot.className = `hotbar-slot ${index === this.game.hotbar.selectedIndex ? 'active' : ''}`;
      slot.dataset.index = index;

      const numKey = document.createElement('span');
      numKey.className = 'slot-key';
      numKey.innerText = `${index + 1}`;
      slot.appendChild(numKey);

      if (slotData && def) {
        const iconImg = this.createItemIcon(slotData.itemId);
        if (iconImg) slot.appendChild(iconImg);

        if (slotData.count > 1) {
          this.updateStackCount(slot, slotData.count);
        }

        if (slotData.durability !== null && slotData.maxDurability) {
          this.updateDurability(slot, slotData.durability, slotData.maxDurability);
        }

        this._attachTooltipEvents(slot, slotData, def);
      }

      slot.addEventListener('click', () => {
        this.game.hotbar.select(index);
      });

      this.hotbarElement.appendChild(slot);
    }
  }

  _createHotbarSlots() {
    this.createHotbar();
  }

  _updateSurvivalBars() {
    if (!this.game.player || !this.game.player.stats) return;
    const stats = this.game.player.stats;

    // 1. Update 10 Pixel Hearts (20 health points = 2 HP per heart)
    if (this.heartsContainer) {
      const hp = Math.max(0, Math.min(stats.maxHealth, stats.health));
      const totalHearts = 10;
      const hpPerHeart = stats.maxHealth / totalHearts;

      const heartImgs = this.heartsContainer.querySelectorAll('.pixel-heart');
      heartImgs.forEach((img, idx) => {
        const heartHpStart = idx * hpPerHeart;
        const heartHpMid = heartHpStart + hpPerHeart / 2;

        if (hp >= heartHpStart + hpPerHeart) {
          img.src = this.iconGenerator.getHeartIconUrl('full');
        } else if (hp >= heartHpMid) {
          img.src = this.iconGenerator.getHeartIconUrl('half');
        } else {
          img.src = this.iconGenerator.getHeartIconUrl('empty');
        }
      });
    }

    // 2. Update 10 Pixel Hunger Units (20 hunger points = 2 hunger per unit)
    if (this.hungerContainer) {
      const hunger = Math.max(0, Math.min(stats.maxHunger, stats.hunger));
      const totalUnits = 10;
      const hungerPerUnit = stats.maxHunger / totalUnits;

      const hungerImgs = this.hungerContainer.querySelectorAll('.pixel-food-unit');
      hungerImgs.forEach((img, idx) => {
        const unitStart = idx * hungerPerUnit;
        const unitMid = unitStart + hungerPerUnit / 2;

        if (hunger >= unitStart + hungerPerUnit) {
          img.src = this.iconGenerator.getHungerIconUrl('full');
        } else if (hunger >= unitMid) {
          img.src = this.iconGenerator.getHungerIconUrl('half');
        } else {
          img.src = this.iconGenerator.getHungerIconUrl('empty');
        }
      });
    }

    // 3. Update XP Progress Bar
    if (this.xpFill) {
      const hungerPct = Math.max(0, Math.min(100, (stats.hunger / stats.maxHunger) * 100));
      this.xpFill.style.width = `${hungerPct}%`;
    }
  }

  _initSplashLifecycle() {
    this.appState = APP_STATE.SPLASH;
    if (!this.splashScreen) {
      this.setAppState(APP_STATE.MAIN_MENU);
      return;
    }

    // Automatic fade out after 2.0s
    this._splashTimer = setTimeout(() => {
      this.dismissSplash();
    }, 2200);

    // Click or keypress skips immediately
    this.splashScreen.addEventListener('click', () => {
      this.dismissSplash();
    });
  }

  dismissSplash() {
    if (this.splashDismissed) return;
    this.splashDismissed = true;
    clearTimeout(this._splashTimer);

    if (this.splashScreen) {
      this.splashScreen.classList.add('fade-out');
      setTimeout(() => {
        if (this.splashScreen) {
          this.splashScreen.style.display = 'none';
        }
      }, 500);
    }

    this.setAppState(APP_STATE.MAIN_MENU);
  }

  setAppState(state) {
    this.appState = state;

    // 1. Splash Screen
    if (this.splashScreen) {
      if (state === APP_STATE.SPLASH) {
        this.splashScreen.style.display = 'flex';
        this.splashScreen.classList.add('active');
        this.splashScreen.classList.remove('fade-out');
      } else {
        this.splashScreen.classList.add('fade-out');
        this.splashScreen.classList.remove('active');
        setTimeout(() => {
          if (this.splashScreen && this.appState !== APP_STATE.SPLASH) {
            this.splashScreen.style.display = 'none';
          }
        }, 500);
      }
    }

    // 2. Main Menu Root Screen
    if (this.startScreen) {
      if (state === APP_STATE.MAIN_MENU) {
        this.startScreen.classList.add('active');
        this.startScreen.style.display = 'flex';
      } else {
        this.startScreen.classList.remove('active');
        this.startScreen.style.display = 'none';
      }
    }

    // 3. Sub-Screen Modals
    if (this.worldSelectModal) {
      if (state === APP_STATE.WORLD_SELECT) {
        this.worldSelectOpen = true;
        this.worldSelectModal.classList.add('active');
        this.worldSelectModal.style.display = 'flex';
        this.renderSavedWorlds();
      } else {
        this.worldSelectOpen = false;
        this.worldSelectModal.classList.remove('active');
        this.worldSelectModal.style.display = 'none';
      }
    }

    if (this.achievementsModal) {
      if (state === APP_STATE.ACHIEVEMENTS) {
        this.achievementsOpen = true;
        this.achievementsModal.classList.add('active');
        this.achievementsModal.style.display = 'flex';
        this.renderAchievements();
      } else {
        this.achievementsOpen = false;
        this.achievementsModal.classList.remove('active');
        this.achievementsModal.style.display = 'none';
      }
    }

    if (this.settingsModal) {
      if (state === APP_STATE.SETTINGS) {
        this.settingsOpen = true;
        this.settingsModal.classList.add('active');
        this.settingsModal.style.display = 'flex';
        this.renderSettings();
      } else {
        this.settingsOpen = false;
        this.settingsModal.classList.remove('active');
        this.settingsModal.style.display = 'none';
      }
    }

    if (this.storeModal) {
      if (state === APP_STATE.STORE) {
        this.storeOpen = true;
        this.storeModal.classList.add('active');
        this.storeModal.style.display = 'flex';
      } else {
        this.storeOpen = false;
        this.storeModal.classList.remove('active');
        this.storeModal.style.display = 'none';
      }
    }

    if (this.pauseModal) {
      if (state === APP_STATE.PAUSED) {
        this.pauseOpen = true;
        this.pauseModal.classList.add('active');
        this.pauseModal.style.display = 'flex';
      } else {
        this.pauseOpen = false;
        this.pauseModal.classList.remove('active');
        this.pauseModal.style.display = 'none';
      }
    }

    if (this.deathModal) {
      if (state === APP_STATE.DEAD) {
        this.deathOpen = true;
        this.deathModal.classList.add('active');
        this.deathModal.style.display = 'flex';
      } else {
        this.deathOpen = false;
        this.deathModal.classList.remove('active');
        this.deathModal.style.display = 'none';
      }
    }

    // 4. Playing State Lifecycle
    if (state === APP_STATE.PLAYING) {
      this.game.isPlaying = true;
      if (this.game.player && this.game.player.cameraController) {
        this.game.player.cameraController.lock();
      }
    } else if (state === APP_STATE.MAIN_MENU || state === APP_STATE.SPLASH || state === APP_STATE.WORLD_SELECT) {
      this.game.isPlaying = false;
      if (this.game.player && this.game.player.cameraController) {
        this.game.player.cameraController.unlock();
      }
    }
  }

  _updateMenuState() {
    if (this.worldSelectOpen) {
      this.renderSavedWorlds();
    }
  }

  isAnyModalOpen() {
    return (
      this.appState !== APP_STATE.PLAYING ||
      this.inventoryOpen ||
      this.craftingOpen ||
      this.smelterOpen ||
      this.chestOpen
    );
  }

  // ============================================================
  // SUB-SCREENS: WORLD SELECT, ACHIEVEMENTS, SETTINGS, STORE
  // ============================================================
  openWorldSelect() {
    this.setAppState(APP_STATE.WORLD_SELECT);
  }

  closeWorldSelect() {
    this.setAppState(APP_STATE.MAIN_MENU);
  }

  async renderSavedWorlds() {
    const listContainer = document.getElementById('saved-worlds-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="world-card-meta" style="padding: 10px; text-align: center;">Loading worlds...</div>';
    const worlds = await SaveSystem.listWorlds();
    listContainer.innerHTML = '';

    const folderBadge = document.getElementById('folder-status-badge');
    if (folderBadge) {
      if (SaveSystem.fs.directoryHandle) {
        folderBadge.innerText = `📁 Linked: ${SaveSystem.fs.directoryHandle.name}`;
        folderBadge.className = 'folder-status-badge synced';
      } else {
        folderBadge.innerText = 'IndexedDB Storage';
        folderBadge.className = 'folder-status-badge';
      }
    }

    if (worlds && worlds.length > 0) {
      for (const worldData of worlds) {
        const savedDate = worldData.lastPlayedAt ? new Date(worldData.lastPlayedAt).toLocaleString() : 'Recently';
        const seed = worldData.seed || 'Minicraft-Seed-1';
        const name = worldData.name || `World ${seed}`;
        const isActive = worldData.id === SaveSystem.activeWorldId;

        const card = document.createElement('div');
        card.className = `world-card ${isActive ? 'active-world' : ''}`;
        card.dataset.worldId = worldData.id;
        card.innerHTML = `
          <div class="world-card-info">
            <div class="world-card-title">${name}</div>
            <div class="world-card-meta">Seed: "${seed}" • Last Played: ${savedDate} • v${worldData.worldVersion || 6}</div>
          </div>
          <div class="world-card-actions">
            <button class="pixel-btn pixel-btn-success btn-load-world">PLAY</button>
            <button class="pixel-btn btn-rename-world" title="Rename World">RENAME</button>
            <button class="pixel-btn btn-duplicate-world" title="Duplicate World">COPY</button>
            <button class="pixel-btn btn-export-world" title="Export Save File">EXPORT</button>
            <button class="pixel-btn pixel-btn-danger btn-delete-world">DEL</button>
          </div>
        `;

        card.querySelector('.btn-load-world').addEventListener('click', async () => {
          await this.game.loadWorldById(worldData.id);
          this.setAppState(APP_STATE.PLAYING);
          this.showToast(`Loaded "${name}"!`);
        });

        card.querySelector('.btn-rename-world').addEventListener('click', () => {
          this.openRenameModal(worldData.id, name);
        });

        card.querySelector('.btn-duplicate-world').addEventListener('click', async () => {
          await SaveSystem.duplicateWorld(worldData.id);
          this.showToast(`Duplicated "${name}"!`);
          this.renderSavedWorlds();
        });

        card.querySelector('.btn-export-world').addEventListener('click', async () => {
          try {
            await SaveSystem.exportWorld(worldData.id);
            this.showToast(`Exported "${name}" save file!`);
          } catch (e) {
            this.showToast('Export failed: ' + e.message);
          }
        });

        card.querySelector('.btn-delete-world').addEventListener('click', () => {
          this.openDeleteConfirm(worldData.id, name);
        });

        listContainer.appendChild(card);
      }
    } else {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'world-card-meta';
      emptyMsg.style.padding = '14px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.innerText = 'No saved worlds found. Create a new world or link your folder below!';
      listContainer.appendChild(emptyMsg);
    }
  }

  openRenameModal(worldId, currentName) {
    this.targetRenameWorldId = worldId;
    if (this.inputRenameWorld) this.inputRenameWorld.value = currentName || '';
    if (this.renameModal) {
      this.renameModal.classList.add('active');
      this.renameModal.style.display = 'flex';
      if (this.inputRenameWorld) this.inputRenameWorld.focus();
    }
  }

  closeRenameModal() {
    this.targetRenameWorldId = null;
    if (this.renameModal) {
      this.renameModal.classList.remove('active');
      this.renameModal.style.display = 'none';
    }
  }

  openDeleteConfirm(worldId, worldName) {
    this.targetDeleteWorldId = worldId;
    this.deleteConfirmOpen = true;
    const msgEl = document.getElementById('delete-confirm-msg');
    if (msgEl) {
      msgEl.innerText = `Are you sure you want to delete "${worldName || 'this world'}"? All progress, terrain changes, and items will be permanently erased!`;
    }
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.add('active');
      this.deleteConfirmModal.style.display = 'flex';
    }
  }

  closeDeleteConfirm() {
    this.targetDeleteWorldId = null;
    this.deleteConfirmOpen = false;
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.remove('active');
      this.deleteConfirmModal.style.display = 'none';
    }
  }

  openAchievements() {
    this.setAppState(APP_STATE.ACHIEVEMENTS);
  }

  closeAchievements() {
    this.setAppState(APP_STATE.MAIN_MENU);
  }

  renderAchievements() {
    const listContainer = document.getElementById('achievements-list-container');
    const countBadge = document.getElementById('achieve-unlocked-count');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const allAchievements = this.achievements.getAll();
    const unlockedCount = this.achievements.getUnlockedCount();

    if (countBadge) countBadge.innerText = `${unlockedCount}`;

    for (const a of allAchievements) {
      const card = document.createElement('div');
      card.className = `achievement-card ${a.unlocked ? 'unlocked' : ''}`;
      card.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-details">
          <div class="achievement-title">${a.title}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
        <div class="achievement-badge ${a.unlocked ? 'unlocked' : ''}">
          ${a.unlocked ? 'UNLOCKED' : 'LOCKED'}
        </div>
      `;
      listContainer.appendChild(card);
    }
  }

  openSettings(fromPause = false) {
    this.settingsOpenedFromPause = fromPause;
    this.setAppState(APP_STATE.SETTINGS);
  }

  closeSettings() {
    if (this.settingsOpenedFromPause) {
      this.setAppState(APP_STATE.PAUSED);
    } else {
      this.setAppState(APP_STATE.MAIN_MENU);
    }
  }

  renderSettings() {
    const s = this.settings.settings;
    const volInput = document.getElementById('setting-volume');
    const volVal = document.getElementById('val-setting-volume');
    if (volInput) volInput.value = s.masterVolume;
    if (volVal) volVal.innerText = `${s.masterVolume}%`;

    const sensInput = document.getElementById('setting-sens');
    const sensVal = document.getElementById('val-setting-sens');
    if (sensInput) sensInput.value = Math.round(s.sensitivity * 100);
    if (sensVal) sensVal.innerText = `${s.sensitivity.toFixed(1)}x`;

    const fovInput = document.getElementById('setting-fov');
    const fovVal = document.getElementById('val-setting-fov');
    if (fovInput) fovInput.value = s.fov;
    if (fovVal) fovVal.innerText = `${s.fov}°`;

    const renderInput = document.getElementById('setting-render-dist');
    const renderVal = document.getElementById('val-setting-render-dist');
    if (renderInput) renderInput.value = s.renderDistance;
    if (renderVal) renderVal.innerText = `${s.renderDistance} Chunks`;

    const btnGfx = document.getElementById('btn-toggle-graphics');
    if (btnGfx) {
      btnGfx.innerText = `Graphics: ${s.graphicsQuality.toUpperCase()}`;
    }
  }

  openStore() {
    this.setAppState(APP_STATE.STORE);
  }

  closeStore() {
    this.setAppState(APP_STATE.MAIN_MENU);
  }

  openDeleteConfirm() {
    this.deleteConfirmOpen = true;
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.add('active');
      this.deleteConfirmModal.style.display = 'flex';
    }
  }

  closeDeleteConfirm() {
    this.deleteConfirmOpen = false;
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.remove('active');
      this.deleteConfirmModal.style.display = 'none';
    }
  }

  // ============================================================
  // EVENT BINDINGS
  // ============================================================
  _bindEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      // Dismiss splash immediately on any key
      if (!this.splashDismissed) {
        this.dismissSplash();
      }

      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.repeat) return; // Ignore repeated key events when key is held down

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyE' || key === 'e') {
        if (!this.startScreen.classList.contains('active') && !this.deathOpen && !this.pauseOpen && !this.isAnyModalOpen()) {
          this.toggleInventory();
        }
      } else if (code === 'KeyC' || key === 'c') {
        if (!this.startScreen.classList.contains('active') && !this.deathOpen && !this.pauseOpen && !this.isAnyModalOpen()) {
          this.toggleCrafting(false);
        }
      } else if (code === 'Escape' || key === 'escape') {
        if (this.deleteConfirmOpen) {
          this.closeDeleteConfirm();
        } else if (this.settingsOpen) {
          this.closeSettings();
        } else if (this.achievementsOpen) {
          this.closeAchievements();
        } else if (this.storeOpen) {
          this.closeStore();
        } else if (this.worldSelectOpen) {
          this.closeWorldSelect();
        } else if (this.isAnyModalOpen()) {
          this.closeAllModals();
        } else if (this.game.isPlaying) {
          this.openPauseMenu();
        }
      } else if (code === 'F3') {
        e.preventDefault();
        this.toggleDebug();
      }
    });

    window.addEventListener('blur', () => {
      if (this.game && this.game.player) {
        this.game.player.resetKeys();
      }
    });

    // Mouse Move for Cursor Float & Tooltips
    window.addEventListener('mousemove', (e) => {
      if (this.heldItem && this.cursorFloat) {
        this.cursorFloat.style.left = `${e.clientX}px`;
        this.cursorFloat.style.top = `${e.clientY}px`;
      }
      if (this.pixelTooltip && this.pixelTooltip.style.display !== 'none') {
        let tx = e.clientX + 12;
        let ty = e.clientY + 12;
        const rect = this.pixelTooltip.getBoundingClientRect();
        if (tx + rect.width > window.innerWidth - 8) {
          tx = e.clientX - rect.width - 8;
        }
        if (ty + rect.height > window.innerHeight - 8) {
          ty = e.clientY - rect.height - 8;
        }
        this.pixelTooltip.style.left = `${tx}px`;
        this.pixelTooltip.style.top = `${ty}px`;
      }
    });

    // Main Menu 4 Buttons
    if (this.btnMenuPlay) {
      this.btnMenuPlay.addEventListener('click', () => {
        this.game.sound?.playClick?.();
        this.openWorldSelect();
      });
    }

    if (this.btnMenuAchievements) {
      this.btnMenuAchievements.addEventListener('click', () => {
        this.game.sound?.playClick?.();
        this.openAchievements();
      });
    }

    if (this.btnMenuSettings) {
      this.btnMenuSettings.addEventListener('click', () => {
        this.game.sound?.playClick?.();
        this.openSettings(false);
      });
    }

    if (this.btnMenuStore) {
      this.btnMenuStore.addEventListener('click', () => {
        this.game.sound?.playClick?.();
        this.openStore();
      });
    }

    // World Select Sub-Modal Buttons
    const btnCloseWorldSelect = document.getElementById('btn-close-world-select');
    const btnBackWorldSelect = document.getElementById('btn-back-from-world-select');
    if (btnCloseWorldSelect) btnCloseWorldSelect.addEventListener('click', () => this.closeWorldSelect());
    if (btnBackWorldSelect) btnBackWorldSelect.addEventListener('click', () => this.closeWorldSelect());

    // Storage Folder Sync Button
    if (this.btnSyncFolder) {
      this.btnSyncFolder.addEventListener('click', async () => {
        if (!SaveSystem.fs.hasFileSystemSupport()) {
          this.showToast('File System API not supported in this browser. Using IndexedDB.');
          return;
        }
        const res = await SaveSystem.fs.selectWorldsDirectory();
        if (res.success) {
          this.showToast(`Linked physical folder: "${res.name}"`);
          this.renderSavedWorlds();
        } else if (!res.aborted) {
          this.showToast(res.error || 'Folder link cancelled');
        }
      });
    }

    // Import World File
    if (this.btnImportWorld && this.inputImportWorld) {
      this.btnImportWorld.addEventListener('click', () => {
        this.inputImportWorld.click();
      });

      this.inputImportWorld.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = await SaveSystem.importWorld(text);
          this.showToast(`Imported world "${imported.name}"!`);
          this.renderSavedWorlds();
        } catch (err) {
          this.showToast(`Import failed: ${err.message}`);
        }
        this.inputImportWorld.value = '';
      });
    }

    // Create New World
    if (this.btnCreateNewWorld) {
      this.btnCreateNewWorld.addEventListener('click', async () => {
        const name = this.inputWorldName ? this.inputWorldName.value.trim() || 'New Survival World' : 'New Survival World';
        const seed = this.seedInput ? this.seedInput.value.trim() || 'Minicraft-Seed-1' : 'Minicraft-Seed-1';
        await this.game.startNewWorld(seed, name);
        this.setAppState(APP_STATE.PLAYING);
        this.showToast(`Created new world "${name}"!`);
      });
    }

    if (this.btnRandomSeed) {
      this.btnRandomSeed.addEventListener('click', () => {
        const prefixes = ['Alpine', 'Boreal', 'Crystal', 'Deep', 'Emerald', 'Frost', 'Golden', 'Horizon', 'Solar', 'Titan'];
        const randomNum = Math.floor(Math.random() * 9000 + 1000);
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const newSeed = `${randomPrefix}-${randomNum}`;
        if (this.seedInput) this.seedInput.value = newSeed;
        this.game.sound?.playClick?.();
      });
    }

    // Rename World Modal Buttons
    if (this.btnConfirmRenameWorld) {
      this.btnConfirmRenameWorld.addEventListener('click', async () => {
        const newName = this.inputRenameWorld ? this.inputRenameWorld.value.trim() : '';
        if (this.targetRenameWorldId && newName) {
          await SaveSystem.renameWorld(this.targetRenameWorldId, newName);
          this.showToast(`Renamed to "${newName}"`);
          this.closeRenameModal();
          this.renderSavedWorlds();
        }
      });
    }

    if (this.btnCancelRenameWorld) {
      this.btnCancelRenameWorld.addEventListener('click', () => this.closeRenameModal());
    }

    // Achievements Modal Buttons
    const btnCloseAchievements = document.getElementById('btn-close-achievements');
    const btnBackAchievements = document.getElementById('btn-back-from-achievements');
    if (btnCloseAchievements) btnCloseAchievements.addEventListener('click', () => this.closeAchievements());
    if (btnBackAchievements) btnBackAchievements.addEventListener('click', () => this.closeAchievements());

    // Settings Modal Buttons & Controls
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnBackSettings = document.getElementById('btn-back-from-settings');
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => this.closeSettings());
    if (btnBackSettings) btnBackSettings.addEventListener('click', () => this.closeSettings());

    const volSlider = document.getElementById('setting-volume');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const valBadge = document.getElementById('val-setting-volume');
        if (valBadge) valBadge.innerText = `${val}%`;
        this.settings.setMasterVolume(val);
      });
    }

    const sensSlider = document.getElementById('setting-sens');
    if (sensSlider) {
      sensSlider.addEventListener('input', (e) => {
        const factor = (parseInt(e.target.value, 10) / 100).toFixed(1);
        const valBadge = document.getElementById('val-setting-sens');
        if (valBadge) valBadge.innerText = `${factor}x`;
        this.settings.setSensitivity(factor);
      });
    }

    const fovSlider = document.getElementById('setting-fov');
    if (fovSlider) {
      fovSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const valBadge = document.getElementById('val-setting-fov');
        if (valBadge) valBadge.innerText = `${val}°`;
        this.settings.setFov(val);
      });
    }

    const renderDistSlider = document.getElementById('setting-render-dist');
    if (renderDistSlider) {
      renderDistSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const valBadge = document.getElementById('val-setting-render-dist');
        if (valBadge) valBadge.innerText = `${val} Chunks`;
        this.settings.setRenderDistance(val);
      });
    }

    const btnToggleGfx = document.getElementById('btn-toggle-graphics');
    if (btnToggleGfx) {
      btnToggleGfx.addEventListener('click', () => {
        const newQuality = this.settings.toggleGraphicsQuality();
        btnToggleGfx.innerText = `Graphics: ${newQuality.toUpperCase()}`;
        this.game.sound?.playClick?.();
      });
    }

    const btnToggleFs = document.getElementById('btn-toggle-fullscreen');
    if (btnToggleFs) {
      btnToggleFs.addEventListener('click', () => {
        this.settings.toggleFullscreen();
        this.game.sound?.playClick?.();
      });
    }

    // Store Modal Buttons
    const btnCloseStore = document.getElementById('btn-close-store');
    const btnBackStore = document.getElementById('btn-back-from-store');
    if (btnCloseStore) btnCloseStore.addEventListener('click', () => this.closeStore());
    if (btnBackStore) btnBackStore.addEventListener('click', () => this.closeStore());

    const skinButtons = document.querySelectorAll('.btn-select-skin');
    skinButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.store-card');
        document.querySelectorAll('.store-card').forEach((c) => c.classList.remove('active'));
        if (card) card.classList.add('active');
        this.showToast(`Selected custom skin "${card.querySelector('.store-card-name')?.innerText}"!`);
        this.game.sound?.playClick?.();
      });
    });

    // Delete Confirmation Modal
    const btnConfirmDelete = document.getElementById('btn-confirm-delete-world');
    const btnCancelDelete = document.getElementById('btn-cancel-delete-world');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        if (this.targetDeleteWorldId) {
          await SaveSystem.deleteWorld(this.targetDeleteWorldId);
          this.closeDeleteConfirm();
          this.renderSavedWorlds();
          this.showToast('World deleted.');
        } else {
          await SaveSystem.clearAllWorlds();
          this.closeDeleteConfirm();
          this.renderSavedWorlds();
          this.showToast('Saved worlds erased.');
        }
      });
    }
    if (btnCancelDelete) {
      btnCancelDelete.addEventListener('click', () => this.closeDeleteConfirm());
    }

    // Pause Menu Buttons
    if (this.btnPauseResume) {
      this.btnPauseResume.addEventListener('click', () => this.closePauseMenu());
    }

    if (this.btnPauseSave) {
      this.btnPauseSave.addEventListener('click', async () => {
        if (this.game) await this.game.saveCurrentState();
        this.showToast('World saved successfully!');
      });
    }

    if (this.btnPauseSettings) {
      this.btnPauseSettings.addEventListener('click', () => {
        this.openSettings(true);
      });
    }

    if (this.btnPauseSeed) {
      this.btnPauseSeed.addEventListener('click', () => {
        this.showToast(`Active World Seed: "${this.game.world.seed}"`, 3500);
      });
    }

    if (this.btnPauseMainMenu) {
      this.btnPauseMainMenu.addEventListener('click', async () => {
        if (this.game) {
          await this.game.saveCurrentState();
          this.game.isPlaying = false;
        }
        this.setAppState(APP_STATE.MAIN_MENU);
        this.renderSavedWorlds();
        this.showToast('World saved. Returned to Main Menu');
      });
    }

    // Inventory Close Button
    const btnCloseInv = document.getElementById('btn-close-inventory');
    if (btnCloseInv) {
      btnCloseInv.addEventListener('click', () => this.closeInventory());
    }

    // Open Recipe Book from Inventory
    const btnOpenCrafting = document.getElementById('btn-open-crafting');
    if (btnOpenCrafting) {
      btnOpenCrafting.addEventListener('click', () => {
        this.closeInventory();
        this.openCrafting(false);
      });
    }

    // Crafting Close Button
    const btnCloseCrafting = document.getElementById('btn-close-crafting');
    if (btnCloseCrafting) {
      btnCloseCrafting.addEventListener('click', () => this.closeCrafting());
    }

    // Crafting Category Tabs
    const tabs = document.querySelectorAll('.crafting-category-tabs .pixel-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCraftCategory = tab.dataset.category;
        this.updateCraftingModalContent();
      });
    });

    // Smelter Close Button
    const btnCloseSmelter = document.getElementById('btn-close-smelter');
    if (btnCloseSmelter) {
      btnCloseSmelter.addEventListener('click', () => this.closeSmelter());
    }

    // Smelter Slot Click handlers
    const smeltIn = document.getElementById('smelter-slot-input');
    if (smeltIn) smeltIn.addEventListener('click', (e) => this._handleSmelterInputClick(e));

    const smeltFuel = document.getElementById('smelter-slot-fuel');
    if (smeltFuel) smeltFuel.addEventListener('click', (e) => this._handleSmelterFuelClick(e));

    const smeltOut = document.getElementById('smelter-slot-output');
    if (smeltOut) smeltOut.addEventListener('click', (e) => this._handleSmelterOutputClick(e));

    // Chest Close Button
    const btnCloseChest = document.getElementById('btn-close-chest');
    if (btnCloseChest) {
      btnCloseChest.addEventListener('click', () => this.closeChest());
    }

    // Respawn button on Death Screen
    if (this.btnRespawn) {
      this.btnRespawn.addEventListener('click', () => {
        this.hideDeathScreen();
        if (this.game.player) {
          this.game.player.respawn();
          this.game.sound?.playLevelUp?.();
        }
        this.showToast('Respawned at safe ground.');
        this._updateSurvivalBars();
        this.game.player.cameraController.lock();
      });
    }

    if (this.btnDeathMenu) {
      this.btnDeathMenu.addEventListener('click', () => {
        this.setAppState(APP_STATE.MAIN_MENU);
      });
    }

    // Setup inventory & hotbar listeners
    if (this.game.inventory) {
      if (typeof this.game.inventory.onChange === 'function') {
        this.game.inventory.onChange(() => {
          this.createHotbar();
          if (this.inventoryOpen) this.updateInventoryModalContent();
          if (this.smelterOpen) this.updateSmelterDisplay();
          if (this.chestOpen) this.updateChestModalContent();
          if (this.craftingOpen) this.updateCraftingModalContent();
          this._updateSurvivalBars();
        });
      }
    }

    if (this.game.hotbar) {
      if (typeof this.game.hotbar.onSelect === 'function') {
        this.game.hotbar.onSelect(() => {
          this.createHotbar();
          if (this.inventoryOpen) this.updateInventoryModalContent();
        });
      }
    }

    if (this.game.player && this.game.player.stats) {
      if (typeof this.game.player.stats.onChange === 'function') {
        this.game.player.stats.onChange(() => {
          this._updateSurvivalBars();
        });
      }
      this.game.player.stats.onDeath = (cause) => {
        this.showDeathScreen(cause);
      };
    }
  }

  openPauseMenu() {
    this.closeAllModals();
    this.setAppState(APP_STATE.PAUSED);
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }
  }

  closePauseMenu() {
    this.setAppState(APP_STATE.PLAYING);
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }
    if (this.game.player) {
      this.game.player.resetKeys();
    }
  }

  // ============================================================
  // HELD ITEM STACK CURSOR MANAGEMENT
  // ============================================================
  _setHeldItem(itemData) {
    this.heldItem = itemData && itemData.itemId && itemData.count > 0 ? itemData : null;

    if (!this.heldItem) {
      if (this.cursorFloat) this.cursorFloat.style.display = 'none';
      return;
    }

    if (this.cursorFloat && this.cursorIcon) {
      this.cursorIcon.src = this.iconGenerator.getIconUrl(this.heldItem.itemId);
      if (this.cursorCount) {
        this.cursorCount.innerText = this.heldItem.count > 1 ? `${this.heldItem.count}` : '';
      }
      this.cursorFloat.style.display = 'flex';
    }
  }

  // ============================================================
  // INVENTORY MODAL (E KEY)
  // ============================================================
  toggleInventory() {
    if (this.inventoryOpen) this.closeInventory();
    else this.openInventory();
  }

  openInventory() {
    this.closeAllModals();
    this.inventoryOpen = true;
    this.inventoryModal.classList.add('active');
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }

    this.updateInventoryModalContent();
    this._renderFieldCrafting();

    if (this.playerPreview) {
      this.playerPreview.start();
    }
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.inventoryModal.classList.remove('active');
    this._hideTooltip();

    if (this.playerPreview) {
      this.playerPreview.stop();
    }

    // Return uncrafted items in 2x2 grid to inventory
    for (let i = 0; i < 4; i++) {
      const slot = this.fieldCraftSlots[i];
      if (slot && slot.itemId) {
        this.game.inventory.addItem(slot.itemId, slot.count, slot.durability);
        this.fieldCraftSlots[i] = null;
      }
    }
    this.fieldCraftOutput = null;

    // Return held cursor item to inventory
    if (this.heldItem) {
      this.game.inventory.addItem(this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
      this._setHeldItem(null);
    }

    if (this.game.player) {
      this.game.player.resetKeys();
    }

    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }

    if (!this.isAnyModalOpen()) {
      this.game.player.cameraController.lock();
      this.game.isPlaying = true;
    }
  }

  updateInventoryModalContent() {
    if (!this.inventoryOpen) return;

    // 1. Render 4 Armor Slots
    this._renderArmorSlots();

    // 2. Render 27 Backpack Slots (Indices 9 to 35)
    const backpackGrid = document.getElementById('inventory-backpack-grid');
    if (backpackGrid) {
      backpackGrid.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        backpackGrid.appendChild(this.createPixelSlot(i));
      }
    }

    // 3. Render 9 Hotbar Slots (Indices 0 to 8)
    const hotbarGrid = document.getElementById('inventory-hotbar-grid');
    if (hotbarGrid) {
      hotbarGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        hotbarGrid.appendChild(this.createPixelSlot(i, { isHotbar: true }));
      }
    }

    // 4. Update Defense Badge & 3D Preview
    const totalDefense = ArmorSystem.getTotalDefense(this.game.inventory);
    if (this.totalDefenseBadge) {
      this.totalDefenseBadge.innerText = `+${totalDefense}`;
    }

    if (this.playerPreview) {
      this.playerPreview.updateArmor(this.game.inventory.equipment);
    }
  }

  _renderArmorSlots() {
    const slots = [
      { id: 'equip-slot-head', key: 'head', title: 'Head Armor' },
      { id: 'equip-slot-chest', key: 'chest', title: 'Chest Armor' },
      { id: 'equip-slot-legs', key: 'legs', title: 'Leg Armor' },
      { id: 'equip-slot-feet', key: 'feet', title: 'Foot Armor' },
    ];

    for (const s of slots) {
      const el = document.getElementById(s.id);
      if (!el) continue;

      const equipped = this.game.inventory.equipment ? this.game.inventory.equipment[s.key] : null;
      el.innerHTML = '';

      if (equipped && equipped.itemId) {
        const def = ItemRegistry.get(equipped.itemId);
        const img = this.createItemIcon(equipped.itemId);
        if (img) el.appendChild(img);

        if (equipped.durability !== null && equipped.maxDurability) {
          this.updateDurability(el, equipped.durability, equipped.maxDurability);
        }

        el.classList.add('has-item');
        this._attachTooltipEvents(el, equipped, def);
      } else {
        el.classList.remove('has-item');
        const silImg = document.createElement('img');
        silImg.className = 'slot-icon-img silhouette-img';
        silImg.src = this.iconGenerator.getArmorSlotSilhouette(s.key);
        silImg.draggable = false;
        el.appendChild(silImg);
        this._detachTooltipEvents(el);
      }

      el.onclick = (e) => this._handleArmorSlotClick(s.key, e);
    }
  }

  // ============================================================
  // INVENTORY SLOT CLICK & DRAG/DROP
  // ============================================================
  _handleInventorySlotClick(index, e) {
    e.preventDefault();
    const isRightClick = e.button === 2;
    const isShiftClick = e.shiftKey;
    const slot = this.game.inventory.getSlot(index);

    // Shift-Click: Fast-equip armor or quick transfer
    if (isShiftClick && slot) {
      const def = ItemRegistry.get(slot.itemId);
      if (def && def.category === ITEM_CATEGORY.ARMOR && def.slot) {
        const currentEquip = this.game.inventory.equipment[def.slot];
        this.game.inventory.equipment[def.slot] = {
          itemId: slot.itemId,
          durability: slot.durability,
          maxDurability: slot.maxDurability,
        };
        this.game.inventory.setSlot(index, currentEquip ? currentEquip.itemId : null, currentEquip ? 1 : 0, currentEquip?.durability);
        this.showToast(`Equipped ${def.name}!`);
        this.updateInventoryModalContent();
        return;
      }
    }

    if (!this.heldItem) {
      if (!slot) return;
      if (isRightClick) {
        const half = Math.ceil(slot.count / 2);
        const remain = slot.count - half;
        this._setHeldItem({ itemId: slot.itemId, count: half, durability: slot.durability, maxDurability: slot.maxDurability });
        if (remain > 0) {
          this.game.inventory.setSlot(index, slot.itemId, remain, slot.durability);
        } else {
          this.game.inventory.setSlot(index, null);
        }
      } else {
        this._setHeldItem({ ...slot });
        this.game.inventory.setSlot(index, null);
      }
    } else {
      const heldDef = ItemRegistry.get(this.heldItem.itemId);
      const maxStack = heldDef ? heldDef.maxStack || 64 : 64;

      if (!slot) {
        if (isRightClick) {
          this.game.inventory.setSlot(index, this.heldItem.itemId, 1, this.heldItem.durability);
          this.heldItem.count--;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        } else {
          this.game.inventory.setSlot(index, this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
          this._setHeldItem(null);
        }
      } else if (slot.itemId === this.heldItem.itemId && maxStack > 1 && !this.heldItem.durability) {
        if (isRightClick) {
          if (slot.count < maxStack) {
            this.game.inventory.setSlot(index, slot.itemId, slot.count + 1);
            this.heldItem.count--;
            if (this.heldItem.count <= 0) this._setHeldItem(null);
            else this._setHeldItem(this.heldItem);
          }
        } else {
          const space = maxStack - slot.count;
          const transfer = Math.min(space, this.heldItem.count);
          this.game.inventory.setSlot(index, slot.itemId, slot.count + transfer);
          this.heldItem.count -= transfer;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        }
      } else {
        const temp = { ...slot };
        this.game.inventory.setSlot(index, this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
        this._setHeldItem(temp);
      }
    }

    this.updateInventoryModalContent();
    this.createHotbar();
  }

  _handleArmorSlotClick(slotKey, e) {
    const equipped = this.game.inventory.equipment ? this.game.inventory.equipment[slotKey] : null;

    if (this.heldItem) {
      const heldDef = ItemRegistry.get(this.heldItem.itemId);
      if (heldDef && heldDef.category === ITEM_CATEGORY.ARMOR && heldDef.slot === slotKey) {
        const prev = equipped;
        this.game.inventory.equipment[slotKey] = {
          itemId: this.heldItem.itemId,
          durability: this.heldItem.durability,
          maxDurability: this.heldItem.maxDurability,
        };
        this._setHeldItem(prev);
        this.showToast(`Equipped ${heldDef.name}!`);
      }
    } else if (equipped) {
      this.game.inventory.equipment[slotKey] = null;
      this._setHeldItem(equipped);
    }

    this.updateInventoryModalContent();
  }

  // ============================================================
  // 2x2 FIELD CRAFTING
  // ============================================================
  _renderFieldCrafting() {
    const grid = document.getElementById('field-craft-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const slotData = this.fieldCraftSlots[i];
      const def = slotData ? ItemRegistry.get(slotData.itemId) : null;

      const slot = document.createElement('div');
      slot.className = `pixel-slot craft-in-slot ${slotData ? 'has-item' : ''}`;
      slot.dataset.craftIdx = i;

      if (slotData && def) {
        const img = this.createItemIcon(slotData.itemId);
        if (img) slot.appendChild(img);

        if (slotData.count > 1) {
          this.updateStackCount(slot, slotData.count);
        }
        this._attachTooltipEvents(slot, slotData, def);
      }

      slot.addEventListener('mousedown', (e) => this._handleCraftInputClick(i, e));
      grid.appendChild(slot);
    }

    this._checkFieldCraftingRecipe();
  }

  _handleCraftInputClick(index, e) {
    e.preventDefault();
    const isRightClick = e.button === 2;
    const slot = this.fieldCraftSlots[index];

    if (!this.heldItem) {
      if (!slot) return;
      if (isRightClick) {
        const half = Math.ceil(slot.count / 2);
        const remain = slot.count - half;
        this._setHeldItem({ itemId: slot.itemId, count: half, durability: slot.durability, maxDurability: slot.maxDurability });
        this.fieldCraftSlots[index] = remain > 0 ? { ...slot, count: remain } : null;
      } else {
        this._setHeldItem(slot);
        this.fieldCraftSlots[index] = null;
      }
    } else {
      if (!slot) {
        if (isRightClick) {
          this.fieldCraftSlots[index] = { ...this.heldItem, count: 1 };
          this.heldItem.count--;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        } else {
          this.fieldCraftSlots[index] = { ...this.heldItem };
          this._setHeldItem(null);
        }
      } else if (slot.itemId === this.heldItem.itemId) {
        if (isRightClick) {
          slot.count++;
          this.heldItem.count--;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        } else {
          slot.count += this.heldItem.count;
          this._setHeldItem(null);
        }
      } else {
        const temp = slot;
        this.fieldCraftSlots[index] = this.heldItem;
        this._setHeldItem(temp);
      }
    }

    this._renderFieldCrafting();
  }

  _checkFieldCraftingRecipe() {
    const outEl = document.getElementById('field-craft-output');
    if (!outEl) return;
    outEl.innerHTML = '';
    this.fieldCraftOutput = null;

    const totalIngredients = {};
    let totalItemsCount = 0;
    for (const slot of this.fieldCraftSlots) {
      if (slot && slot.itemId) {
        totalIngredients[slot.itemId] = (totalIngredients[slot.itemId] || 0) + slot.count;
        totalItemsCount++;
      }
    }

    if (totalItemsCount === 0) return;

    const fieldRecipes = RECIPES.filter((r) => !r.requiresBench);
    let matchedRecipe = null;

    for (const recipe of fieldRecipes) {
      let match = true;
      let usedTypesCount = 0;

      for (const input of recipe.inputs) {
        const have = totalIngredients[input.itemId] || 0;
        if (have < input.count) {
          match = false;
          break;
        }
        usedTypesCount++;
      }

      if (match && Object.keys(totalIngredients).length === usedTypesCount) {
        matchedRecipe = recipe;
        break;
      }
    }

    if (matchedRecipe) {
      this.fieldCraftOutput = matchedRecipe;
      const def = ItemRegistry.get(matchedRecipe.output.itemId);

      const img = this.createItemIcon(matchedRecipe.output.itemId);
      if (img) outEl.appendChild(img);

      if (matchedRecipe.output.count > 1) {
        this.updateStackCount(outEl, matchedRecipe.output.count);
      }

      outEl.classList.add('has-item');
      this._attachTooltipEvents(outEl, { count: matchedRecipe.output.count }, def);

      outEl.onclick = () => this._handleCraftOutputClick();
    } else {
      outEl.classList.remove('has-item');
      outEl.onclick = null;
    }
  }

  _handleCraftOutputClick() {
    if (!this.fieldCraftOutput) return;

    const recipe = this.fieldCraftOutput;
    const def = ItemRegistry.get(recipe.output.itemId);
    const craftCount = recipe.output.count || 1;

    if (this.heldItem) {
      if (this.heldItem.itemId !== recipe.output.itemId) return;
      const maxStack = def ? def.maxStack || 64 : 64;
      if (this.heldItem.count + craftCount > maxStack) return;
    }

    for (const input of recipe.inputs) {
      let needed = input.count;
      for (let i = 0; i < 4; i++) {
        const slot = this.fieldCraftSlots[i];
        if (slot && slot.itemId === input.itemId) {
          const deduct = Math.min(needed, slot.count);
          slot.count -= deduct;
          needed -= deduct;
          if (slot.count <= 0) this.fieldCraftSlots[i] = null;
          if (needed <= 0) break;
        }
      }
    }

    if (!this.heldItem) {
      this._setHeldItem({
        itemId: recipe.output.itemId,
        count: craftCount,
        durability: def?.durability || null,
        maxDurability: def?.durability || null,
      });
    } else {
      this.heldItem.count += craftCount;
      this._setHeldItem(this.heldItem);
    }

    this.game.sound?.playCraftSuccess?.();
    this.showToast(`Crafted ${def ? def.name : 'Item'}!`);
    this._renderFieldCrafting();
  }

  // ============================================================
  // WORKBENCH CRAFTING MODAL (C KEY / RIGHT-CLICK BENCH)
  // ============================================================
  toggleCrafting(isWorkbench = false) {
    if (this.craftingOpen) this.closeCrafting();
    else this.openCrafting(isWorkbench);
  }

  openCrafting(isWorkbench = false) {
    this.closeAllModals();
    this.craftingOpen = true;
    this.game.crafting.setNearBench(isWorkbench);

    if (this.craftingBenchBanner) {
      this.craftingBenchBanner.style.display = isWorkbench ? 'block' : 'none';
    }
    if (this.craftingModalTitle) {
      this.craftingModalTitle.innerText = isWorkbench ? 'WORKBENCH CRAFTING STATION' : 'FIELD CRAFTING';
    }

    this.craftingModal.classList.add('active');
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }
    this.updateCraftingModalContent();
  }

  closeCrafting() {
    this.craftingOpen = false;
    this.craftingModal.classList.remove('active');
    this._hideTooltip();
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }
    if (this.game.player) {
      this.game.player.resetKeys();
    }
    if (!this.isAnyModalOpen()) {
      this.game.player.cameraController.lock();
      this.game.isPlaying = true;
    }
  }

  updateCraftingModalContent() {
    if (!this.recipeListContainer) return;
    this.recipeListContainer.innerHTML = '';

    const isNearBench = this.game.crafting.isNearBench;
    const recipes = getRecipesByCategory(this.activeCraftCategory, isNearBench);

    for (const recipe of recipes) {
      const outputDef = ItemRegistry.get(recipe.output.itemId);
      const canCraft = this.game.crafting.canCraft(recipe, isNearBench);

      const card = document.createElement('div');
      card.className = `recipe-card ${canCraft ? 'craftable' : ''}`;

      const info = document.createElement('div');
      info.className = 'recipe-info';

      const iconImg = this.createItemIcon(recipe.output.itemId);

      const details = document.createElement('div');
      details.className = 'recipe-details';

      const title = document.createElement('div');
      title.className = 'recipe-title';
      title.innerText = `${recipe.name} ${recipe.output.count > 1 ? 'x' + recipe.output.count : ''}`;

      const reqs = document.createElement('div');
      reqs.className = 'recipe-reqs';

      for (const input of recipe.inputs) {
        const inputDef = ItemRegistry.get(input.itemId);
        const haveCount = this.game.inventory.getItemCount(input.itemId);
        const hasEnough = haveCount >= input.count;

        const badge = document.createElement('span');
        badge.className = `req-badge ${hasEnough ? 'has-item' : 'missing-item'}`;
        badge.innerText = `${inputDef ? inputDef.name : input.itemId}: ${haveCount}/${input.count}`;
        reqs.appendChild(badge);
      }

      details.appendChild(title);
      details.appendChild(reqs);
      if (iconImg) info.appendChild(iconImg);
      info.appendChild(details);

      const btn = document.createElement('button');
      btn.className = 'btn-craft';
      btn.innerText = 'CRAFT';
      btn.disabled = !canCraft;

      btn.addEventListener('click', () => {
        const result = this.game.crafting.craft(recipe, isNearBench);
        if (result.success) {
          this.game.sound?.playCraftSuccess?.();
          this.showToast(`Crafted ${result.name}!`);
          this.updateCraftingModalContent();
        }
      });

      card.appendChild(info);
      card.appendChild(btn);
      this.recipeListContainer.appendChild(card);
    }
  }

  // ============================================================
  // SMELTER MODAL
  // ============================================================
  openSmelter(smelterState) {
    this.closeAllModals();
    this.activeSmelter = smelterState;
    this.smelterOpen = true;
    this.smelterModal.classList.add('active');
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }
    this.updateSmelterDisplay();
  }

  closeSmelter() {
    this.smelterOpen = false;
    this.activeSmelter = null;
    this.smelterModal.classList.remove('active');
    this._hideTooltip();
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }
    if (this.game.player) {
      this.game.player.resetKeys();
    }
    if (!this.isAnyModalOpen()) {
      this.game.player.cameraController.lock();
      this.game.isPlaying = true;
    }
  }

  updateSmelterDisplay() {
    if (!this.smelterOpen || !this.activeSmelter) return;

    const s = this.activeSmelter;
    const inputEl = document.getElementById('smelter-slot-input');
    const fuelEl = document.getElementById('smelter-slot-fuel');
    const outputEl = document.getElementById('smelter-slot-output');
    const flameCanvas = document.getElementById('smelter-flame-canvas');
    const flameFill = document.getElementById('smelter-flame-fill');
    const cookFill = document.getElementById('smelter-cook-fill');

    if (inputEl) {
      inputEl.innerHTML = '';
      if (s.input) {
        const def = ItemRegistry.get(s.input.itemId);
        const img = this.createItemIcon(s.input.itemId);
        if (img) inputEl.appendChild(img);
        if (s.input.count > 1) this.updateStackCount(inputEl, s.input.count);
        this._attachTooltipEvents(inputEl, s.input, def);
      } else {
        inputEl.innerHTML = `<span class="slot-placeholder">Ore / Meat</span>`;
      }
    }

    if (fuelEl) {
      fuelEl.innerHTML = '';
      if (s.fuel) {
        const def = ItemRegistry.get(s.fuel.itemId);
        const img = this.createItemIcon(s.fuel.itemId);
        if (img) fuelEl.appendChild(img);
        if (s.fuel.count > 1) this.updateStackCount(fuelEl, s.fuel.count);
        this._attachTooltipEvents(fuelEl, s.fuel, def);
      } else {
        fuelEl.innerHTML = `<span class="slot-placeholder">Coal / Wood</span>`;
      }
    }

    if (outputEl) {
      outputEl.innerHTML = '';
      if (s.output) {
        const def = ItemRegistry.get(s.output.itemId);
        const img = this.createItemIcon(s.output.itemId);
        if (img) outputEl.appendChild(img);
        if (s.output.count > 1) this.updateStackCount(outputEl, s.output.count);
        this._attachTooltipEvents(outputEl, s.output, def);
      } else {
        outputEl.innerHTML = `<span class="slot-placeholder">Output</span>`;
      }
    }

    // Render Animated Pixel Flame Canvas
    if (flameCanvas) {
      const ctx = flameCanvas.getContext('2d');
      ctx.clearRect(0, 0, 24, 24);
      if (s.burnTimeRemaining > 0) {
        const flameImg = new Image();
        flameImg.src = this.iconGenerator.getFlameIconUrl(this.flameFrame);
        if (flameImg.complete) {
          ctx.drawImage(flameImg, 0, 0);
        } else {
          flameImg.onload = () => ctx.drawImage(flameImg, 0, 0);
        }
      }
    }

    if (flameFill) {
      const flamePercent = s.maxBurnTime > 0 ? (s.burnTimeRemaining / s.maxBurnTime) * 100 : 0;
      flameFill.style.height = `${flamePercent}%`;
    }

    if (cookFill) {
      const cookPercent = s.maxCookDuration > 0 ? (s.cookProgress / s.maxCookDuration) * 100 : 0;
      cookFill.style.width = `${cookPercent}%`;
    }

    // Render player slots in smelter dialog (27 backpack + 9 hotbar)
    const bpGrid = document.getElementById('smelter-player-backpack-grid');
    if (bpGrid) {
      bpGrid.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        bpGrid.appendChild(this.createPixelSlot(i));
      }
    }

    const hbGrid = document.getElementById('smelter-player-hotbar-grid');
    if (hbGrid) {
      hbGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        hbGrid.appendChild(this.createPixelSlot(i, { isHotbar: true }));
      }
    }
  }

  _handleSmelterInputClick(e) {
    if (!this.activeSmelter) return;
    if (this.heldItem && getSmeltingRecipe(this.heldItem.itemId)) {
      if (!this.activeSmelter.input) {
        this.activeSmelter.input = { itemId: this.heldItem.itemId, count: this.heldItem.count };
        this._setHeldItem(null);
      } else if (this.activeSmelter.input.itemId === this.heldItem.itemId) {
        this.activeSmelter.input.count += this.heldItem.count;
        this._setHeldItem(null);
      }
    } else if (this.activeSmelter.input) {
      const returned = this.activeSmelter.input;
      this.activeSmelter.input = null;
      this._setHeldItem(returned);
    }
    this.updateSmelterDisplay();
  }

  _handleSmelterFuelClick(e) {
    if (!this.activeSmelter) return;
    if (this.heldItem && isFuel(this.heldItem.itemId)) {
      if (!this.activeSmelter.fuel) {
        this.activeSmelter.fuel = { itemId: this.heldItem.itemId, count: this.heldItem.count };
        this._setHeldItem(null);
      } else if (this.activeSmelter.fuel.itemId === this.heldItem.itemId) {
        this.activeSmelter.fuel.count += this.heldItem.count;
        this._setHeldItem(null);
      }
    } else if (this.activeSmelter.fuel) {
      const returned = this.activeSmelter.fuel;
      this.activeSmelter.fuel = null;
      this._setHeldItem(returned);
    }
    this.updateSmelterDisplay();
  }

  _handleSmelterOutputClick(e) {
    if (!this.activeSmelter || !this.activeSmelter.output) return;
    const out = this.activeSmelter.output;
    this.activeSmelter.output = null;
    this._setHeldItem(out);
    this.showToast(`Collected smelted item!`);
    this.updateSmelterDisplay();
  }

  // ============================================================
  // STORAGE CHEST MODAL (27 CHEST + 36 PLAYER SLOTS)
  // ============================================================
  openChest(chest) {
    this.closeAllModals();
    this.activeChest = chest;
    this.chestOpen = true;
    this.chestModal.classList.add('active');
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }
    this.game.sound?.playChestOpen?.();
    this.updateChestModalContent();
  }

  closeChest() {
    this.chestOpen = false;
    this.activeChest = null;
    this.chestModal.classList.remove('active');
    this.game.sound?.playChestClose?.();
    this._hideTooltip();
    if (this.heldItem) {
      this.game.inventory.addItem(this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
      this._setHeldItem(null);
    }
    if (this.game.player) {
      this.game.player.resetKeys();
    }
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }
    if (!this.isAnyModalOpen()) {
      this.game.player.cameraController.lock();
      this.game.isPlaying = true;
    }
  }

  updateChestModalContent() {
    if (!this.chestOpen || !this.activeChest) return;

    // 1. Render 27 Chest Slots (9x3)
    const chestGrid = document.getElementById('chest-grid');
    if (chestGrid) {
      chestGrid.innerHTML = '';
      for (let i = 0; i < 27; i++) {
        chestGrid.appendChild(this.createPixelSlot(i, { isChest: true }));
      }
    }

    // 2. Render Player Backpack Slots (9 to 35 = 27 slots)
    const playerBpGrid = document.getElementById('chest-player-backpack-grid');
    if (playerBpGrid) {
      playerBpGrid.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        playerBpGrid.appendChild(this.createPixelSlot(i));
      }
    }

    // 3. Render Player Hotbar Slots (0 to 8 = 9 slots)
    const playerHbGrid = document.getElementById('chest-player-hotbar-grid');
    if (playerHbGrid) {
      playerHbGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        playerHbGrid.appendChild(this.createPixelSlot(i, { isHotbar: true }));
      }
    }
  }

  _handleChestSlotClick(index, e) {
    e.preventDefault();
    if (!this.activeChest) return;

    const isRightClick = e.button === 2;
    const isShiftClick = e.shiftKey;
    const slot = this.activeChest.getSlot(index);

    // Shift-Click: Fast transfer to Player Inventory
    if (isShiftClick && slot) {
      const added = this.game.inventory.addItem(slot.itemId, slot.count, slot.durability);
      if (added > 0) {
        this.activeChest.removeItem(slot.itemId, added);
        this.updateChestModalContent();
      }
      return;
    }

    if (!this.heldItem) {
      if (!slot) return;
      if (isRightClick) {
        const half = Math.ceil(slot.count / 2);
        const remain = slot.count - half;
        this._setHeldItem({ itemId: slot.itemId, count: half, durability: slot.durability, maxDurability: slot.maxDurability });
        if (remain > 0) {
          this.activeChest.setSlot(index, slot.itemId, remain, slot.durability);
        } else {
          this.activeChest.setSlot(index, null);
        }
      } else {
        this._setHeldItem({ ...slot });
        this.activeChest.setSlot(index, null);
      }
    } else {
      const heldDef = ItemRegistry.get(this.heldItem.itemId);
      const maxStack = heldDef ? heldDef.maxStack || 64 : 64;

      if (!slot) {
        if (isRightClick) {
          this.activeChest.setSlot(index, this.heldItem.itemId, 1, this.heldItem.durability);
          this.heldItem.count--;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        } else {
          this.activeChest.setSlot(index, this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
          this._setHeldItem(null);
        }
      } else if (slot.itemId === this.heldItem.itemId && maxStack > 1 && !this.heldItem.durability) {
        if (isRightClick) {
          if (slot.count < maxStack) {
            this.activeChest.setSlot(index, slot.itemId, slot.count + 1);
            this.heldItem.count--;
            if (this.heldItem.count <= 0) this._setHeldItem(null);
            else this._setHeldItem(this.heldItem);
          }
        } else {
          const space = maxStack - slot.count;
          const transfer = Math.min(space, this.heldItem.count);
          this.activeChest.setSlot(index, slot.itemId, slot.count + transfer);
          this.heldItem.count -= transfer;
          if (this.heldItem.count <= 0) this._setHeldItem(null);
          else this._setHeldItem(this.heldItem);
        }
      } else {
        const temp = { ...slot };
        this.activeChest.setSlot(index, this.heldItem.itemId, this.heldItem.count, this.heldItem.durability);
        this._setHeldItem(temp);
      }
    }

    this.updateChestModalContent();
  }

  // ============================================================
  // TOOLTIP ATTACHMENTS
  // ============================================================
  _attachTooltipEvents(el, slotData, def) {
    if (!el || !def) return;
    el.onmouseenter = (e) => {
      this._showTooltip(slotData, def, e.clientX, e.clientY);
    };
    el.onmouseleave = () => {
      this._hideTooltip();
    };
  }

  _detachTooltipEvents(el) {
    if (!el) return;
    el.onmouseenter = null;
    el.onmouseleave = null;
  }

  _showTooltip(slotData, def, clientX, clientY) {
    if (!this.pixelTooltip || !def) return;

    const titleEl = document.getElementById('tooltip-title');
    const catEl = document.getElementById('tooltip-category');
    const tierEl = document.getElementById('tooltip-tier');
    const statsEl = document.getElementById('tooltip-stats');
    const durEl = document.getElementById('tooltip-durability');
    const descEl = document.getElementById('tooltip-desc');

    if (titleEl) titleEl.innerText = def.name || 'Item';
    if (catEl) catEl.innerText = def.category || 'ITEM';
    if (tierEl) tierEl.innerText = def.tier ? `Tier: ${def.tier}` : '';

    if (statsEl) {
      statsEl.innerHTML = '';
      if (def.attackDamage) {
        statsEl.innerHTML += `<div>Damage: +${def.attackDamage}</div>`;
      }
      if (def.miningSpeedMultiplier && def.miningSpeedMultiplier > 1) {
        statsEl.innerHTML += `<div>Mining Speed: ${def.miningSpeedMultiplier}x</div>`;
      }
      if (def.defense) {
        statsEl.innerHTML += `<div>Defense: +${def.defense}</div>`;
      }
      if (def.hungerRestore) {
        statsEl.innerHTML += `<div>Hunger: +${def.hungerRestore}</div>`;
      }
      if (def.healthRestore) {
        statsEl.innerHTML += `<div>Health: +${def.healthRestore}</div>`;
      }
      if (def.fuelDuration) {
        statsEl.innerHTML += `<div>Fuel Duration: ${def.fuelDuration}s</div>`;
      }
    }

    if (durEl) {
      const dur = slotData.durability ?? def.durability;
      const maxDur = slotData.maxDurability ?? def.durability;
      if (dur !== null && maxDur) {
        durEl.style.display = 'block';
        const durText = document.getElementById('tooltip-dur-text');
        const durFill = document.getElementById('tooltip-dur-fill');
        if (durText) durText.innerText = `${dur} / ${maxDur}`;
        if (durFill) {
          const pct = Math.max(0, Math.min(100, (dur / maxDur) * 100));
          durFill.style.width = `${pct}%`;
          durFill.style.backgroundColor = pct < 25 ? '#ef4444' : pct < 55 ? '#f59e0b' : '#22c55e';
        }
      } else {
        durEl.style.display = 'none';
      }
    }

    if (descEl) {
      descEl.innerText = def.description || '';
      descEl.style.display = def.description ? 'block' : 'none';
    }

    this.pixelTooltip.style.display = 'block';
  }

  _hideTooltip() {
    if (this.pixelTooltip) {
      this.pixelTooltip.style.display = 'none';
    }
  }

  // ============================================================
  // DEATH SCREEN & GENERAL MODAL CONTROLS
  // ============================================================
  showDeathScreen(cause) {
    this.closeAllModals();
    if (this.deathCauseText) {
      this.deathCauseText.innerText = cause || 'Perished in the wilderness';
    }
    this.setAppState(APP_STATE.DEAD);
    if (this.game.player) {
      this.game.player.resetKeys();
      this.game.player.cameraController.unlock();
    }
  }

  hideDeathScreen() {
    this.setAppState(APP_STATE.PLAYING);
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.game.canvas && typeof this.game.canvas.focus === 'function') {
      this.game.canvas.focus();
    }
    if (this.game.player) {
      this.game.player.resetKeys();
    }
  }

  closeAllModals() {
    if (this.inventoryOpen) this.closeInventory();
    if (this.craftingOpen) this.closeCrafting();
    if (this.smelterOpen) this.closeSmelter();
    if (this.chestOpen) this.closeChest();
    if (this.pauseOpen) this.closePauseMenu();
  }

  triggerHurtFlash() {
    if (!this.hurtOverlay) return;
    this.hurtOverlay.classList.add('flash');
    setTimeout(() => {
      this.hurtOverlay.classList.remove('flash');
    }, 150);
  }

  showToast(message, duration = 2800) {
    if (!this.toastElement) return;
    this.toastElement.innerText = message;
    this.toastElement.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      this.toastElement.classList.remove('show');
    }, duration);
  }

  toggleDebug() {
    this.debugVisible = !this.debugVisible;
    this.debugPanel.style.display = this.debugVisible ? 'block' : 'none';
  }

  update(delta) {
    // 1. Calculate FPS
    this.fpsCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.fpsCount / this.fpsTimer);
      this.frameTimeMs = (1000 / Math.max(1, this.currentFps)).toFixed(1);
      this.fpsCount = 0;
      this.fpsTimer = 0;
    }

    // 2. Flame animation timer for smelter
    this.flameTimer += delta;
    if (this.flameTimer >= 0.15) {
      this.flameFrame = (this.flameFrame + 1) % 4;
      this.flameTimer = 0;
    }

    // 3. Update Active Mining Progress Bar
    if (this.game.player.isMining && this.game.player.miningTarget) {
      const p = Math.max(0, Math.min(100, this.game.player.miningProgress * 100));
      if (this.miningProgressBar) {
        this.miningProgressBar.style.width = `${p}%`;
        const container = document.getElementById('mining-progress-container');
        if (container) container.style.display = 'block';
      }
    } else {
      const container = document.getElementById('mining-progress-container');
      if (container) container.style.display = 'none';
    }

    // 4. In-World Farming / Target Tooltip
    if (this.farmingTooltip && this.game.player && this.game.player.cameraController?.isLocked) {
      const target = typeof this.game.player.getTargetBlock === 'function' 
        ? this.game.player.getTargetBlock() 
        : (this.game.player.targetedVoxel?.hit ? this.game.player.targetedVoxel : null);
      const selectedSlot = this.game.hotbar ? this.game.hotbar.getSelectedSlot() : null;
      const itemDef = selectedSlot ? ItemRegistry.get(selectedSlot.itemId) : null;

      if (target) {
        if (target.blockId === BLOCK.TILLED_SOIL) {
          if (itemDef && itemDef.category === 'SEED') {
            this.farmingTooltip.innerText = `Plant ${itemDef.name} (RMB)`;
            this.farmingTooltip.style.display = 'block';
          } else {
            this.farmingTooltip.innerText = 'Farmland (Hold Seeds & RMB)';
            this.farmingTooltip.style.display = 'block';
          }
        } else if (target.blockId === BLOCK.WHEAT_MATURE) {
          this.farmingTooltip.innerText = 'Mature Wheat (LMB to Harvest)';
          this.farmingTooltip.style.display = 'block';
        } else if (target.blockId === BLOCK.WHEAT_STAGE_1 || target.blockId === BLOCK.WHEAT_STAGE_2) {
          this.farmingTooltip.innerText = 'Growing Wheat';
          this.farmingTooltip.style.display = 'block';
        } else if (target.blockId === BLOCK.CRAFTING_BENCH) {
          this.farmingTooltip.innerText = 'Crafting Bench (RMB to Open)';
          this.farmingTooltip.style.display = 'block';
        } else if (target.blockId === BLOCK.CHARCOAL_SMELTER) {
          this.farmingTooltip.innerText = 'Charcoal Smelter (RMB to Open)';
          this.farmingTooltip.style.display = 'block';
        } else if (target.blockId === BLOCK.STORAGE_CHEST) {
          this.farmingTooltip.innerText = 'Storage Chest (RMB to Open)';
          this.farmingTooltip.style.display = 'block';
        } else if ((target.blockId === BLOCK.GRASS || target.blockId === BLOCK.DIRT) && itemDef && itemDef.toolType === TOOL_TYPES.HOE) {
          this.farmingTooltip.innerText = 'Till Soil (RMB)';
          this.farmingTooltip.style.display = 'block';
        } else {
          this.farmingTooltip.style.display = 'none';
        }
      } else {
        this.farmingTooltip.style.display = 'none';
      }
    } else if (this.farmingTooltip) {
      this.farmingTooltip.style.display = 'none';
    }

    // 5. Update Smelter Modal live gauges
    if (this.smelterOpen) {
      this.updateSmelterDisplay();
    }

    // 6. Update F3 Telemetry Panel & Diagnostic Mode
    const p = this.game.player.position;
    const isLocked = typeof document !== 'undefined' && !!document.pointerLockElement;
    const pressedKeys = this.game.player.getPressedKeys ? this.game.player.getPressedKeys() : 'None';

    // Global Diagnostics Object for automated/browser testing (Step 3)
    if (typeof window !== 'undefined') {
      window.__BW_GAME__ = this.game;
      window.__BW_DIAGNOSTICS__ = {
        gameLoopRunning: true,
        inventoryOpen: this.inventoryOpen,
        gamePaused: !this.game.isPlaying,
        pointerLockElement: isLocked,
        keysPressed: pressedKeys,
        playerUpdateCalled: this.game.player.updateCount || 0,
        playerPosition: `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`,
      };
    }

    if (this.debugVisible && this.debugPanel) {
      let b = { name: 'Verdant Plains' };
      if (this.game.world) {
        if (typeof this.game.world.getBiomeAt === 'function') {
          b = this.game.world.getBiomeAt(p.x, p.z) || b;
        } else if (this.game.world.biomeManager) {
          b = (typeof this.game.world.biomeManager.getBiomeAt === 'function' ? this.game.world.biomeManager.getBiomeAt(p.x, p.z) : this.game.world.biomeManager.getBiome(p.x, p.z)) || b;
        }
      }
      const stats = this.game.player.stats;
      const heldSlot = this.game.hotbar.getSelectedSlot();
      const heldDef = heldSlot ? ItemRegistry.get(heldSlot.itemId) : null;
      const defense = ArmorSystem.getTotalDefense(this.game.inventory);
      const mobCounts = this.game.entities ? this.game.entities.getMobCounts() : { total: 0, passive: 0, hostile: 0 };

      const timeStr = this.game.dayNightCycle ? this.game.dayNightCycle.getTimeFormatted() : '12:00';
      const isNight = this.game.dayNightCycle ? this.game.dayNightCycle.isNight() : false;

      const currentY = Math.floor(p.y);
      let stratumName = 'Surface / Atmosphere';
      let activeOres = 'Surface Biome Minerals';

      if (currentY <= -70) {
        stratumName = 'Layer 9: Bedrock Floor (Unbreakable Y=-70)';
        activeOres = 'None (Bedrock Floor)';
      } else if (currentY <= -56) {
        stratumName = 'Layer 8: Ancient Lower Rock [Deepslate Strata] (Y=-56..-69)';
        activeOres = '💎 Deep Diamonds, 🔴 Deep Redstone';
      } else if (currentY <= -36) {
        stratumName = 'Layer 7: Deep Underground [Deepslate] (Y=-36..-55)';
        activeOres = '💎 Diamond/Crystal, 🔴 Redstone, 🟡 Deep Gold';
      } else if (currentY <= -16) {
        stratumName = 'Layer 6: Deep-Rock Transition [Stone/Deepslate Mix] (Y=-16..-35)';
        activeOres = '🟡 Gold Peak (Y≈-16), 🔶 Iron, 🔴 Redstone';
      } else if (currentY <= 14) {
        stratumName = 'Layer 5: Lower Stone [Rugged Stone & Tuff] (Y=14..-15)';
        activeOres = '🔵 Lapis Lazuli Peak (Y≈0), 🔶 Iron, 🟡 Gold';
      } else if (currentY <= 39) {
        stratumName = 'Layer 4: Middle Stone [Granite, Diorite, Andesite] (Y=39..15)';
        activeOres = '🟤 Copper, 🔶 Iron Peak (Y≈16), 🔵 Lapis';
      } else if (currentY <= 64) {
        stratumName = 'Layer 3: Upper Stone [Stone & Mineral Veins] (Y=64..40)';
        activeOres = '🟤 Copper Peak (Y≈48), ⬛ Coal, 🔶 Iron';
      } else if (currentY <= 74) {
        stratumName = 'Layer 2: Deep Soil & Gravel [Dirt & Gravel Pockets] (Y=74..65)';
        activeOres = '⚪ Gravel Pockets, ⬛ Coal';
      } else {
        stratumName = 'Layer 1: Surface & Topsoil [Grass, Sand, Snow] (Y=80..75)';
        activeOres = '🟢 Mountain Emeralds (Snow Peaks Y≥72), ⬛ Coal';
      }

      this.debugPanel.innerHTML = `
        <div class="debug-title">MINICRAFT V8.5 TELEMETRY [9 WORLD LAYERS & ORE GEOLOGY]</div>
        <div class="debug-row">FPS: <span class="val-fps">${this.currentFps}</span> (${this.frameTimeMs} ms)</div>
        <div class="debug-row">XYZ: ${p.x.toFixed(2)} / <strong style="color: #4ade80;">${p.y.toFixed(2)}</strong> / ${p.z.toFixed(2)}</div>
        <div class="debug-row">Geological Stratum: <strong style="color: #60a5fa;">${stratumName}</strong></div>
        <div class="debug-row">Target Ore Distribution: <span style="color: #fde047;">${activeOres}</span></div>
        <div class="debug-row">Biome: <span class="val-biome">${b.name}</span> | Time: <strong>${timeStr} (${isNight ? 'Night' : 'Day'})</strong></div>
        <hr class="debug-divider">
        <div class="debug-row">DIAGNOSTICS: Loop: <strong>RUNNING</strong> | Paused: <strong>${!this.game.isPlaying}</strong></div>
        <div class="debug-row">Inventory: <strong>${this.inventoryOpen ? 'OPEN' : 'CLOSED'}</strong> | PointerLock: <strong>${isLocked ? 'LOCKED' : 'UNLOCKED'}</strong></div>
        <div class="debug-row">Keys: <strong>${pressedKeys}</strong> | Updates: <strong>${this.game.player.updateCount || 0}</strong></div>
        <hr class="debug-divider">
        <div class="debug-row">Health: <strong>${Math.round(stats.health)}</strong> / ${stats.maxHealth} | Hunger: <strong>${Math.round(stats.hunger)}</strong></div>
        <div class="debug-row">Armor Defense: <strong>${defense}</strong> | Active: <strong>${heldDef ? heldDef.name : 'Bare Hands'}</strong></div>
        <div class="debug-row">Entities: Total: <strong>${mobCounts.total}</strong> (Passive: ${mobCounts.passive}, Hostile: ${mobCounts.hostile})</div>
        <div class="debug-row">World Seed: <strong>"${this.game.world.seed}"</strong></div>
      `;
    }
  }
}
