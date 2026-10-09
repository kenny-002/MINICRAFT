import * as THREE from 'three';
import { Inventory } from './src/scripts/inventory/Inventory.js';
import { Hotbar } from './src/scripts/inventory/Hotbar.js';
import { ItemDropManager } from './src/scripts/items/ItemDropManager.js';
import { PlayerStats } from './src/scripts/player/PlayerStats.js';
import { ArmorSystem } from './src/scripts/armor/ArmorSystem.js';
import { SaveSystem } from './src/scripts/save/SaveSystem.js';
import { BLOCK } from './src/scripts/blocks/BlockTypes.js';
import { ITEMS } from './src/scripts/items/ItemTypes.js';

// Setup Mock World & Scene
const scene = new THREE.Scene();
const mockWorld = {
  seed: 'TestSeed-Survival',
  modifiedBlocks: {},
  getBlock: (x, y, z) => BLOCK.AIR,
  getHeightAt: (x, z) => 10,
};

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${msg}`);
    failed++;
  }
}

console.log('🧪 RUNNING BLOCKWORLD V5.8 SURVIVAL, COMBAT, DEATH & LOOT DROP TEST SUITE...\n');

// -------------------------------------------------------------
// TEST 1: Fresh World Starts 100% Empty
// -------------------------------------------------------------
console.log('--- Case 1: Fresh World Inventory & Stats Initialization ---');
const inv1 = new Inventory();
let allEmpty = true;
for (let i = 0; i < 36; i++) {
  if (inv1.getSlot(i) !== null) allEmpty = false;
}
assert(allEmpty, 'All 36 inventory and hotbar slots are 100% empty on new world creation');
assert(inv1.equipment.head === null && inv1.equipment.chest === null, 'All armor slots start empty');

const stats1 = new PlayerStats();
assert(stats1.health === 100, 'Player starts with 100 HP (full health)');
assert(stats1.hunger === 100, 'Player starts with 100 hunger');
assert(!stats1.isDead, 'Player is alive initially');

// -------------------------------------------------------------
// TEST 2: Combat Damage, Armor Reduction & Death Trigger
// -------------------------------------------------------------
console.log('--- Case 2: Damage, Armor Defense & Single Death Trigger ---');
const stats2 = new PlayerStats();
let deathCount = 0;
stats2.onDeath = (cause) => {
  deathCount++;
};

stats2.takeDamage(20, 'melee', 'Zombie');
assert(stats2.health === 80, 'Player takes 20 melee damage without armor (80 HP left)');

// Equip crystal armor
inv1.setEquipment('chest', ITEMS.CRYSTAL_CHESTPLATE);
const defense = ArmorSystem.getTotalDefense(inv1);
assert(defense > 0, `Crystal chestplate grants ${defense} defense points`);

const mitigated = ArmorSystem.applyDamageReduction(20, defense);
assert(mitigated < 20, `20 raw damage reduced to ${mitigated} by armor`);

// Lethal damage
stats2.takeDamage(200, 'melee', 'Lethal Boss');
assert(stats2.health === 0, 'Health clamps cleanly at 0 upon lethal damage');
assert(stats2.isDead === true, 'Player stats marks isDead = true');
assert(deathCount === 1, 'onDeath triggered exactly once on lethal blow');

// Subsequent damage while dead must not trigger extra deaths
stats2.takeDamage(50, 'melee', 'Overkill');
assert(deathCount === 1, 'Subsequent damage while dead does not trigger multiple death callbacks');

// -------------------------------------------------------------
// TEST 3: Drop ALL Carried Items on Death
// -------------------------------------------------------------
console.log('--- Case 3: Drop ALL Carried Items & Clear Inventory ---');
const dropMgr = new ItemDropManager(mockWorld, scene);
const inv3 = new Inventory();
inv3.addItem(ITEMS.WOOD, 16);
inv3.addItem(ITEMS.STONE, 32);
inv3.addItem(ITEMS.IRON_SWORD, 1, 150);
inv3.setEquipment('head', ITEMS.IRON_HELMET);

const initialItemCount = inv3.getAllItems().filter(e => e.item !== null).length;
assert(initialItemCount >= 3, 'Inventory populated with carried items and armor before death');

const deathPos = new THREE.Vector3(10, 10.5, 20);
const spawnedList = dropMgr.spawnDeathDrops(inv3, deathPos);
assert(spawnedList.length >= 4, `Successfully spawned ${spawnedList.length} drop stacks in world at death location`);

inv3.clearAll();
assert(inv3.getAllItems().filter(e => e.item !== null).length === 0, 'Inventory slots completely cleared after death drop creation');
assert(inv3.equipment.head === null, 'Equipped armor cleared after death drops');

// -------------------------------------------------------------
// TEST 4: Return and Collect Dropped Items
// -------------------------------------------------------------
console.log('--- Case 4: World Drop Physics, Pickup Radius & Collection ---');
// Advance time past pickup delay (player far away at 100m)
dropMgr.update(2.0, { position: new THREE.Vector3(100, 0, 100) }, inv3, null, null);
assert(inv3.getAllItems().filter(e => e.item !== null).length === 0, 'Drops are NOT collected when player is far away (100m)');

// Player returns to death site
let pickupSoundPlayed = false;
let toastShown = false;
const mockSound = { playItemPickup: () => { pickupSoundPlayed = true; } };
const mockUI = { showToast: () => { toastShown = true; } };

dropMgr.update(0.1, { position: deathPos }, inv3, mockSound, mockUI);
assert(inv3.getAllItems().filter(e => e.item !== null).length > 0, 'Player successfully collects drops upon returning to death site');
assert(pickupSoundPlayed === true, 'Item pickup audio feedback triggered');
assert(toastShown === true, 'Item pickup UI toast displayed');

// -------------------------------------------------------------
// TEST 5: Full Inventory Behavior (Leaves Excess Drops)
// -------------------------------------------------------------
console.log('--- Case 5: Full Inventory Leaves Excess Items on Ground ---');
const fullInv = new Inventory();
// Fill all 36 slots
for (let i = 0; i < 36; i++) {
  fullInv.setSlot(i, ITEMS.DIRT, 64);
}
const dropPos = new THREE.Vector3(5, 10, 5);
dropMgr.spawnDrop(ITEMS.GOLD_INGOT, 10, dropPos.x, dropPos.y, dropPos.z);
dropMgr.update(2.0, { position: new THREE.Vector3(100, 0, 100) }, fullInv, null, null); // tick delay

// Player walks near gold drop with full inventory
dropMgr.update(0.1, { position: dropPos }, fullInv, null, null);
const goldInInv = fullInv.getItemCount(ITEMS.GOLD_INGOT);
assert(goldInInv === 0, 'Full inventory does NOT collect items when no slots/stack space available');
assert(dropMgr.drops.length > 0, 'Excess item remains safely on the ground in the world');

// -------------------------------------------------------------
// TEST 6: Save & Load Persistence of Dropped Items in World
// -------------------------------------------------------------
console.log('--- Case 6: Dropped Items Save & Load Persistence ---');
const savedState = dropMgr.saveState();
assert(savedState.length > 0, `Serialized ${savedState.length} active world item drops`);

const dropMgr2 = new ItemDropManager(mockWorld, scene);
dropMgr2.loadState(savedState);
assert(dropMgr2.drops.length === savedState.length, `Restored ${dropMgr2.drops.length} world item drops without loss`);

// -------------------------------------------------------------
// TEST 7: Respawn Rules
// -------------------------------------------------------------
console.log('--- Case 7: Player Respawn Rules ---');
const statsRespawn = new PlayerStats();
statsRespawn.takeDamage(100, 'melee', 'Test');
assert(statsRespawn.isDead === true, 'Player marked dead');

statsRespawn.reset();
assert(statsRespawn.isDead === false, 'Player is alive after stats.reset()');
assert(statsRespawn.health === 100, 'Player health restored to 100 on respawn');
assert(statsRespawn.hunger === 100, 'Player hunger restored to 100 on respawn');

console.log('\n======================================================');
console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
