import * as THREE from 'three';
import { Player } from './src/scripts/player/Player.js';
import { Inventory } from './src/scripts/inventory/Inventory.js';
import { Hotbar } from './src/scripts/inventory/Hotbar.js';
import { ITEMS } from './src/scripts/items/ItemTypes.js';

console.log('🧪 RUNNING BLOCKWORLD V5.4 COMPREHENSIVE INPUT & MOVEMENT LIFECYCLE TEST SUITE...\n');

// Mock World and Terrain
const mockWorld = {
  scene: new THREE.Scene(),
  seed: 'test-seed-v54',
  getBlock: (x, y, z) => (y <= 10 ? 1 : 0),
  terrainGenerator: {
    getHeight: () => 10,
    seaLevel: 8,
  },
};

const mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const mockCanvas = {
  requestPointerLock: () => {},
  addEventListener: () => {},
  focus: () => {},
};
const mockSound = {};

const inventory = new Inventory();
const hotbar = new Hotbar(inventory);
const player = new Player(mockWorld, mockCamera, mockCanvas, inventory, mockSound);

// Mock UIManager with full modal state tracking & diagnostics
class MockUIManager {
  constructor(game) {
    this.game = game;
    this.inventoryOpen = false;
    this.craftingOpen = false;
    this.smelterOpen = false;
    this.chestOpen = false;
    this.deathOpen = false;
    this.pauseOpen = false;
    this.startScreen = { classList: { contains: () => false } };
  }

  isAnyModalOpen() {
    return (
      this.inventoryOpen ||
      this.craftingOpen ||
      this.smelterOpen ||
      this.chestOpen ||
      this.deathOpen ||
      this.pauseOpen ||
      (this.startScreen && this.startScreen.classList.contains('active'))
    );
  }

  openInventory() {
    this.inventoryOpen = true;
    this.game.player.resetKeys();
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.game.player.resetKeys();
    if (!this.isAnyModalOpen()) {
      this.game.isPlaying = true;
    }
  }

  openCrafting() {
    this.craftingOpen = true;
    this.game.player.resetKeys();
  }

  closeCrafting() {
    this.craftingOpen = false;
    this.game.player.resetKeys();
    if (!this.isAnyModalOpen()) {
      this.game.isPlaying = true;
    }
  }

  openSmelter() {
    this.smelterOpen = true;
    this.game.player.resetKeys();
  }

  closeSmelter() {
    this.smelterOpen = false;
    this.game.player.resetKeys();
    if (!this.isAnyModalOpen()) {
      this.game.isPlaying = true;
    }
  }

  openChest() {
    this.chestOpen = true;
    this.game.player.resetKeys();
  }

  closeChest() {
    this.chestOpen = false;
    this.game.player.resetKeys();
    if (!this.isAnyModalOpen()) {
      this.game.isPlaying = true;
    }
  }

  openPauseMenu() {
    this.pauseOpen = true;
    this.game.player.resetKeys();
    this.game.isPlaying = false;
  }

  closePauseMenu() {
    this.pauseOpen = false;
    this.game.player.resetKeys();
    if (!this.isAnyModalOpen()) {
      this.game.isPlaying = true;
    }
  }
}

const mockGame = {
  player,
  inventory,
  hotbar,
  canvas: mockCanvas,
  isPlaying: true,
};
const ui = new MockUIManager(mockGame);
mockGame.ui = ui;
player.game = mockGame;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// Case 1: Initial Spawn & WASD Movement
console.log('--- Case 1: Testing Initial Spawn & WASD Movement ---');
player.spawnAtSafePosition(0, 0);
assert(player.position.y >= 11.0, 'Player spawns safely above ground at Y >= 11.0');

// Forward (W)
const initZ = player.position.z;
player.keys.forward = true;
player.update(0.1, hotbar);
assert(player.position.z < initZ, 'W key moves player forward along -Z axis');
player.keys.forward = false;

// Backward (S)
const prevZ = player.position.z;
player.keys.backward = true;
player.update(0.1, hotbar);
assert(player.position.z > prevZ, 'S key moves player backward along +Z axis');
player.keys.backward = false;

// Left (A)
const initX = player.position.x;
player.keys.left = true;
player.update(0.1, hotbar);
assert(player.position.x < initX, 'A key moves player left along -X axis');
player.keys.left = false;

// Right (D)
const prevX = player.position.x;
player.keys.right = true;
player.update(0.1, hotbar);
assert(player.position.x > prevX, 'D key moves player right along +X axis');
player.keys.right = false;

// Case 2: Open inventory, close it, and immediately move again
console.log('--- Case 2: Open Inventory, Close, and Immediately Move ---');
ui.openInventory();
assert(ui.isAnyModalOpen() === true, 'isAnyModalOpen is true when inventory is open');
assert(player.keys.forward === false, 'Player keys are reset on inventory open');

// Simulate key press inside inventory (should not move)
const posWhileOpenZ = player.position.z;
player.keys.forward = true;
player.update(0.1, hotbar);
assert(player.position.z === posWhileOpenZ, 'Player position is locked while inventory is open');

ui.closeInventory();
assert(ui.isAnyModalOpen() === false, 'isAnyModalOpen is false after inventory close');

// Move immediately after closing
player.keys.forward = true;
player.update(0.1, hotbar);
assert(player.position.z < posWhileOpenZ, 'Player immediately moves forward after inventory closes');
player.keys.forward = false;

// Case 3: Repeat Open/Close 12 Times
console.log('--- Case 3: 12 Repeated Inventory Toggle Cycles ---');
let allCyclesValid = true;
for (let i = 0; i < 12; i++) {
  ui.openInventory();
  if (!ui.isAnyModalOpen()) allCyclesValid = false;
  ui.closeInventory();
  if (ui.isAnyModalOpen()) allCyclesValid = false;
  player.keys.forward = true;
  const startZ = player.position.z;
  player.update(0.05, hotbar);
  if (player.position.z >= startZ) allCyclesValid = false;
  player.keys.forward = false;
}
assert(allCyclesValid, '12 consecutive open/close cycles maintained 100% movement responsiveness');

// Case 4: Inventory Slot Interaction & Move
console.log('--- Case 4: Inventory Slot Item Transfer & Move ---');
inventory.addItem(ITEMS.WOOD, 16);
ui.openInventory();
inventory.setSlot(10, ITEMS.STONE, 8);
assert(inventory.getSlot(10).itemId === ITEMS.STONE, 'Item was set in backpack slot 10 during inventory open');
ui.closeInventory();
player.keys.right = true;
const preSlotMoveX = player.position.x;
player.update(0.1, hotbar);
assert(player.position.x > preSlotMoveX, 'Player moves right after item manipulation and inventory close');
player.keys.right = false;

// Case 5: Jumping & Mouse Look Calculation
console.log('--- Case 5: Jumping & Mouse Camera Look ---');
player.physics.isGrounded = true;
player.keys.jump = true;
player.update(0.1, hotbar);
assert(player.position.y > 11.0, 'Jump successfully elevated player Y position');
player.keys.jump = false;

// Test Camera Yaw and Pitch rotation
player.cameraController.yaw = Math.PI / 2; // Look 90 degrees right
const forward90 = player.cameraController.getForwardVector();
assert(Math.abs(forward90.x - (-1)) < 0.01, 'Camera yaw correctly recalculates forward vector to -X');

// Case 6: Tab Switch / Blur / Visibility Change
console.log('--- Case 6: Tab Switch & Window Blur Safety ---');
player.keys.forward = true;
player.keys.jump = true;
player.keys.sprint = true;
assert(player.getPressedKeys().includes('W') && player.getPressedKeys().includes('Space'), 'Keys registered as pressed');
player.resetKeys();
assert(player.getPressedKeys() === 'None', 'resetKeys cleanly sets pressed keys to None on blur/visibility change');

// Case 7: Crafting, Smelter, Chest, and Pause Interfaces
console.log('--- Case 7: All Modal Interface Transitions ---');
// Crafting
ui.openCrafting();
assert(ui.isAnyModalOpen() === true, 'Crafting open sets isAnyModalOpen true');
ui.closeCrafting();
assert(ui.isAnyModalOpen() === false, 'Crafting close sets isAnyModalOpen false');

// Smelter
ui.openSmelter();
assert(ui.isAnyModalOpen() === true, 'Smelter open sets isAnyModalOpen true');
ui.closeSmelter();
assert(ui.isAnyModalOpen() === false, 'Smelter close sets isAnyModalOpen false');

// Chest
ui.openChest();
assert(ui.isAnyModalOpen() === true, 'Chest open sets isAnyModalOpen true');
ui.closeChest();
assert(ui.isAnyModalOpen() === false, 'Chest close sets isAnyModalOpen false');

// Pause Menu
ui.openPauseMenu();
assert(ui.isAnyModalOpen() === true && !mockGame.isPlaying, 'Pause menu opens and pauses game');
ui.closePauseMenu();
assert(ui.isAnyModalOpen() === false && mockGame.isPlaying, 'Pause menu closes and resumes game');

// Case 8: Diagnostics Telemetry
console.log('--- Case 8: Diagnostics Verification ---');
assert(typeof player.updateCount === 'number' && player.updateCount > 0, `player.updateCount is active (${player.updateCount} updates)`);
assert(typeof player.getPressedKeys === 'function', 'getPressedKeys diagnostic function is present');

console.log(`\n======================================================`);
console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log(`======================================================`);

if (failed > 0) process.exit(1);
