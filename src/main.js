import * as THREE from 'three';
import { World } from './scripts/world/World.js';
import { Player } from './scripts/player/Player.js';
import { Inventory } from './scripts/inventory/Inventory.js';
import { Hotbar } from './scripts/inventory/Hotbar.js';
import { CraftingSystem } from './scripts/crafting/CraftingSystem.js';
import { StorageSystem } from './scripts/storage/StorageSystem.js';
import { SmeltingSystem } from './scripts/smelting/SmeltingSystem.js';
import { FarmingSystem } from './scripts/farming/FarmingSystem.js';
import { EntityManager } from './scripts/entities/EntityManager.js';
import { CombatSystem } from './scripts/combat/CombatSystem.js';
import { ItemDropManager } from './scripts/items/ItemDropManager.js';
import { ItemRegistry, TOOL_TYPES } from './scripts/items/ItemTypes.js';
import { BLOCK } from './scripts/blocks/BlockTypes.js';
import { DayNightCycle } from './scripts/environment/DayNightCycle.js';
import { UIManager } from './scripts/ui/UIManager.js';
import { SaveSystem } from './scripts/save/SaveSystem.js';
import { SoundSystem } from './scripts/audio/SoundSystem.js';

export class BlockWorldGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.startScreen = document.getElementById('start-screen');

    // 1. Three.js Scene, Camera, Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } catch (err) {
      console.warn('WebGL context unavailable, falling back to mock renderer:', err.message);
      this.renderer = {
        setSize: () => {},
        setPixelRatio: () => {},
        render: () => {},
        shadowMap: { enabled: false },
        domElement: this.canvas,
      };
    }

    // 2. Audio & Game Systems
    this.sound = new SoundSystem();
    const defaultSeed = 'BlockWorld-Seed-1';
    this.world = new World(this.scene, defaultSeed);
    this.inventory = new Inventory();
    this.hotbar = new Hotbar(this.inventory);
    this.crafting = new CraftingSystem(this.inventory);
    this.storage = new StorageSystem();
    this.smelting = new SmeltingSystem();
    this.farming = new FarmingSystem(this.world);
    this.itemDrops = new ItemDropManager(this.world, this.scene);
    this.entities = new EntityManager(this.world, this.scene);
    this.dayNightCycle = new DayNightCycle(this.scene);
    this.player = new Player(this.world, this.camera, this.canvas, this.inventory, this.sound);
    this.player.game = this;
    this.combat = new CombatSystem(this.player, this.entities, this.sound);
    this.ui = new UIManager(this);

    if (typeof window !== 'undefined') {
      window.game = this;
    }

    // 3. Setup Entity & Player Stat Callbacks
    this._setupCallbacks();

    // 4. Initialize Multi-World SaveSystem & load latest world
    SaveSystem.init().then(async () => {
      const latestWorld = await SaveSystem.load();
      if (latestWorld) {
        await this.loadWorldById(latestWorld.id);
      } else {
        this.player.spawnAtSafePosition(0, 0);
        this.world.initInitialChunks(this.player.position.x, this.player.position.z);
      }
      if (this.ui && typeof this.ui.renderSavedWorlds === 'function') {
        this.ui.renderSavedWorlds();
      }
    });

    // 5. Timing & State
    this.clock = new THREE.Clock();
    this.isPlaying = false;
    this.autoSaveTimer = 0;
    this.wasInWater = false;

    this._bindEvents();
    this._startLoop();
  }

  _setupCallbacks() {
    // Mob attack on player
    this.entities.onPlayerAttacked = (damage, mob) => {
      if (this.player && this.player.stats && !this.player.stats.isDead) {
        this.sound.playPlayerHurt();
        this.ui.triggerHurtFlash();
        this.player.stats.takeDamage(damage, 'melee', `Slain by ${mob.mobType}`);
        this.markDirtyAndSave();
      }
    };

    // Mob slain loot drops in the 3D world
    this.entities.onMobKilled = (mob, drops) => {
      if (drops && drops.length > 0) {
        for (const drop of drops) {
          this.itemDrops.spawnDrop(
            drop.itemId,
            drop.count,
            mob.position.x,
            mob.position.y + 0.4,
            mob.position.z
          );
        }
      }
      this.ui.showToast(`Slain ${mob.mobType}!`);
      if (this.ui.achievements) {
        this.ui.achievements.unlock('monster_hunter');
      }
      this.markDirtyAndSave();
    };

    // Player Death Lifecycle: Drop all carried items, clear inventory, trigger death screen
    if (this.player && this.player.stats) {
      this.player.stats.onDeath = (cause) => {
        this.sound.playPlayerDeath();
        this.itemDrops.spawnDeathDrops(this.inventory, this.player.position);
        this.inventory.clearAll();
        this.ui.createHotbar();
        if (this.ui.inventoryOpen) this.ui.updateInventoryModalContent();
        this.ui.showDeathScreen(cause);
        this.saveCurrentState();
      };
    }
  }

  async loadWorldById(worldId) {
    const savedData = await SaveSystem.getWorld(worldId);
    if (!savedData) return false;

    SaveSystem.activeWorldId = worldId;
    SaveSystem.activeWorldName = savedData.name || 'Survival World';

    // Clean up existing chunks, entities, and world drops
    for (const chunk of this.world.chunks.values()) {
      if (chunk.solidMesh) this.scene.remove(chunk.solidMesh);
      if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
      chunk.dispose();
    }
    this.entities.clear();
    this.itemDrops.clear();

    this.world = new World(this.scene, savedData.seed || 'Minicraft-Seed-1');
    this.player.world = this.world;
    this.player.physics.world = this.world;
    this.farming.world = this.world;
    this.entities.world = this.world;
    this.itemDrops.world = this.world;

    this.inventory = new Inventory();
    this.player.inventory = this.inventory;
    this.player.game = this;
    this.hotbar.inventory = this.inventory;
    this.crafting.inventory = this.inventory;
    this.storage = new StorageSystem();
    this.smelting = new SmeltingSystem();
    this.farming = new FarmingSystem(this.world);

    this.inventory.onChange(() => {
      this.ui.createHotbar();
      if (this.ui.inventoryOpen) this.ui.updateInventoryModalContent();
      if (this.ui.smelterOpen) this.ui.updateSmelterDisplay();
      if (this.ui.chestOpen) this.ui.updateChestModalContent();
      if (this.ui.craftingOpen) this.ui.updateCraftingModalContent();
      this.ui._updateSurvivalBars();
      this.markDirtyAndSave();
    });

    SaveSystem.applyToWorld(
      savedData,
      this.world,
      this.player,
      this.inventory,
      this.dayNightCycle,
      this.hotbar,
      this.storage,
      this.smelting,
      this.farming,
      this.itemDrops,
      this.entities
    );

    this.world.initInitialChunks(this.player.position.x, this.player.position.z);
    this.ui._createHotbarSlots();
    this.ui.updateInventoryModalContent();
    this.ui._updateSurvivalBars();
    return true;
  }

  async startNewWorld(seed, worldName = 'New Survival World') {
    // Clean up existing chunks, entities, and world drops
    for (const chunk of this.world.chunks.values()) {
      if (chunk.solidMesh) this.scene.remove(chunk.solidMesh);
      if (chunk.waterMesh) this.scene.remove(chunk.waterMesh);
      chunk.dispose();
    }
    this.entities.clear();
    this.itemDrops.clear();

    // Create new record in multi-world SaveSystem
    const newRecord = await SaveSystem.createNewWorldRecord(worldName, seed);

    this.world = new World(this.scene, newRecord.seed);
    this.player.world = this.world;
    this.player.physics.world = this.world;
    this.farming.world = this.world;
    this.entities.world = this.world;
    this.itemDrops.world = this.world;

    this.inventory = new Inventory();
    this.player.inventory = this.inventory;
    this.player.game = this;
    this.hotbar.inventory = this.inventory;
    this.crafting.inventory = this.inventory;
    this.storage = new StorageSystem();
    this.smelting = new SmeltingSystem();
    this.farming = new FarmingSystem(this.world);

    this.inventory.onChange(() => {
      this.ui.createHotbar();
      if (this.ui.inventoryOpen) this.ui.updateInventoryModalContent();
      if (this.ui.smelterOpen) this.ui.updateSmelterDisplay();
      if (this.ui.chestOpen) this.ui.updateChestModalContent();
      if (this.ui.craftingOpen) this.ui.updateCraftingModalContent();
      this.ui._updateSurvivalBars();
      this.markDirtyAndSave();
    });

    this.player.spawnAtSafePosition(0, 0);
    if (this.player.stats) this.player.stats.reset();

    this.world.initInitialChunks(this.player.position.x, this.player.position.z);
    this.ui._createHotbarSlots();
    this.ui.updateInventoryModalContent();
    this.ui._updateSurvivalBars();
    this.ui._updateMenuState();
    this.ui.showToast('Collect wood and materials to begin your survival journey.', 4500);

    // Initial sync of new world
    await this.saveCurrentState();
  }

  async saveCurrentState() {
    if (!this.isPlaying && !SaveSystem.activeWorldId) return;
    return await SaveSystem.save(
      this.world,
      this.player,
      this.inventory,
      this.dayNightCycle,
      this.hotbar,
      this.storage,
      this.smelting,
      this.farming,
      this.itemDrops,
      this.entities
    );
  }

  markDirtyAndSave() {
    if (!this.isPlaying) return;
    clearTimeout(this._dirtySaveTimeout);
    this._dirtySaveTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 2000);
  }

  _bindEvents() {
    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // PointerLock state change
    this.player.cameraController.setLockChangeCallback((isLocked) => {
      if (isLocked) {
        this.startScreen.classList.remove('active');
        if (this.ui.pauseOpen) this.ui.closePauseMenu();
        this.isPlaying = true;
      } else {
        this.player.stopMining();
        this.player.resetKeys();
      }
    });

    // Click on canvas to lock mouse and resume play when no UI modal is open
    this.canvas.addEventListener('click', () => {
      if (!this.ui.isAnyModalOpen()) {
        this.player.cameraController.lock();
        this.isPlaying = true;
      }
    });

    // Mouse down for mining / combat and right-click actions
    window.addEventListener('mousedown', (e) => {
      if (!this.player.cameraController.isLocked) {
        if (!this.ui.isAnyModalOpen()) {
          this.player.cameraController.lock();
          this.isPlaying = true;
        }
        return;
      }

      if (e.button === 0) {
        // Left Click: Check if targeting creature for melee combat
        const targetDirection = new THREE.Vector3();
        this.camera.getWorldDirection(targetDirection);
        const mobInCrosshair = this.entities.findMobInRay(this.camera.position, targetDirection, 3.2);

        if (mobInCrosshair) {
          this.combat.performAttack(this.hotbar);
        } else {
          // Continuous block mining
          this.player.startMining(this.hotbar);
        }
      } else if (e.button === 2) {
        // Right Click: Context-aware actions
        e.preventDefault();
        this._handleRightClick();
      }
    });

    // Mouse up to stop mining
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.player.stopMining();
      }
    });

    // Prevent default right-click context menu
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Save before page unload / refresh
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });
  }

  _handleRightClick() {
    const target = this.player.getTargetBlock();
    const selectedSlot = this.hotbar.getSelectedSlot();
    const itemDef = selectedSlot ? ItemRegistry.get(selectedSlot.itemId) : null;

    // 1. Station Interactions
    if (target) {
      // Crafting Bench
      if (target.blockId === BLOCK.CRAFTING_BENCH) {
        this.ui.openCrafting(true);
        this.sound.playCraftSuccess?.();
        return;
      }

      // Charcoal Smelter
      if (target.blockId === BLOCK.CHARCOAL_SMELTER) {
        const smelter = this.smelting.getSmelter(target.x, target.y, target.z);
        this.ui.openSmelter(smelter);
        return;
      }

      // Storage Chest
      if (target.blockId === BLOCK.STORAGE_CHEST) {
        const chest = this.storage.getChest(target.x, target.y, target.z);
        this.ui.openChest(chest);
        return;
      }

      // Farming: Tilling soil with Hoe
      if (itemDef && itemDef.toolType === TOOL_TYPES.HOE) {
        const tilled = this.farming.tillSoil(target.x, target.y, target.z);
        if (tilled) {
          this.sound.playFarmingTill();
          this.hotbar.damageActiveTool(1);
          return;
        }
      }

      // Farming: Planting Seed on Tilled Soil
      if (target.blockId === BLOCK.TILLED_SOIL && itemDef && itemDef.category === 'SEED') {
        const planted = this.farming.plantSeed(target.x, target.y, target.z, itemDef.id);
        if (planted) {
          this.hotbar.consumeSelectedBlock();
          this.sound.playBlockPlace(itemDef.cropBlockId);
          return;
        }
      }
    }

    if (!selectedSlot) return;

    // 2. Eating Food
    if (itemDef && itemDef.category === 'FOOD') {
      if (this.player.stats && this.player.stats.hunger < this.player.stats.maxHunger) {
        const consumed = this.player.stats.eat(itemDef);
        if (consumed) {
          this.sound.playEatCrunch();
          this.hotbar.consumeSelectedBlock();
          this.ui.showToast(`Ate ${itemDef.name} (+${itemDef.hungerRestore} Hunger)`);
          return;
        }
      } else {
        this.ui.showToast('Hunger is already satisfied!');
        return;
      }
    }

    // 3. Block Placement (including Torches, Smelter, Chests, Benches)
    const blockId = this.hotbar.getSelectedBlock();
    if (blockId && blockId !== BLOCK.AIR) {
      const placed = this.player.placeBlock(blockId);
      if (placed) {
        this.sound.playBlockPlace(blockId);
        this.hotbar.consumeSelectedBlock();
      }
    }
  }

  _startLoop() {
    let titleCameraAngle = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = Math.min(this.clock.getDelta(), 0.1);

      // --- TITLE SCREEN & MAIN MENU MODE ---
      if (!this.isPlaying) {
        titleCameraAngle += delta * 0.08;
        const radius = 42;
        const camX = Math.sin(titleCameraAngle) * radius;
        const camZ = Math.cos(titleCameraAngle) * radius;
        const camY = 25 + Math.sin(titleCameraAngle * 0.4) * 3;

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(0, 14, 0);

        // Soft ambient environment progression
        try {
          this.dayNightCycle.update(delta * 0.15);
        } catch (e) {}

        try {
          this.world.update(new THREE.Vector3(0, 14, 0), delta);
        } catch (e) {}

        try {
          this.ui.update(delta);
        } catch (e) {}

        this.renderer.render(this.scene, this.camera);
        return;
      }

      // --- ACTIVE SURVIVAL GAMEPLAY MODE ---
      // Water splash detection
      if (this.player.physics.isInWater && !this.wasInWater) {
        this.sound.playWaterSplash();
      }
      this.wasInWater = this.player.physics.isInWater;

      // Updates
      try {
        this.player.update(delta, this.hotbar);
      } catch (err) {
        console.error('Player update error:', err);
      }

      try {
        this.world.update(this.player.position, delta);
      } catch (err) {
        console.error('World update error:', err);
      }

      try {
        this.dayNightCycle.update(delta);
      } catch (err) {
        console.error('DayNightCycle update error:', err);
      }

      try {
        this.combat.update(delta);
      } catch (err) {
        console.error('Combat update error:', err);
      }

      try {
        this.itemDrops.update(delta, this.player, this.inventory, this.sound, this.ui);
      } catch (err) {
        console.error('Item drops update error:', err);
      }

      try {
        this.smelting.update(delta);
      } catch (err) {
        console.error('Smelting update error:', err);
      }

      try {
        this.farming.update(delta);
      } catch (err) {
        console.error('Farming update error:', err);
      }

      try {
        this.entities.update(delta, this.player.position, this.dayNightCycle);
      } catch (err) {
        console.error('Entities update error:', err);
      }

      try {
        this.ui.update(delta);
      } catch (err) {
        console.error('UI update error:', err);
      }

      // Auto-save every 60 seconds while playing
      this.autoSaveTimer += delta;
      if (this.autoSaveTimer >= 60) {
        this.saveCurrentState();
        this.autoSaveTimer = 0;
      }

      // Render Scene
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

// Start Game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new BlockWorldGame();
});
