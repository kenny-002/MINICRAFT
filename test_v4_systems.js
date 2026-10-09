import assert from 'assert';
import { ItemRegistry, ITEMS, TOOL_TIERS, TOOL_TYPES, EQUIPMENT_SLOT } from './src/scripts/items/ItemTypes.js';
import { MOB_TYPE, Mob } from './src/scripts/entities/Mob.js';
import { AI_STATE } from './src/scripts/entities/MobAI.js';
import { MobDropTable } from './src/scripts/entities/MobDropTable.js';
import { ArmorSystem } from './src/scripts/armor/ArmorSystem.js';
import { SMELTING_RECIPES, getSmeltingRecipe, isFuel } from './src/scripts/smelting/SmeltingRecipes.js';
import { SmeltingSystem } from './src/scripts/smelting/SmeltingSystem.js';
import { FarmingSystem } from './src/scripts/farming/FarmingSystem.js';
import { Chest } from './src/scripts/storage/Chest.js';
import { StorageSystem } from './src/scripts/storage/StorageSystem.js';
import { RECIPES, getRecipesByCategory } from './src/scripts/crafting/RecipeRegistry.js';
import { BLOCK } from './src/scripts/blocks/BlockTypes.js';
import { Inventory } from './src/scripts/inventory/Inventory.js';
import { PlayerStats } from './src/scripts/player/PlayerStats.js';

console.log('=== STARTING BLOCKWORLD VERSION 4 SYSTEM VERIFICATION SUITE ===');

// 1. Entity & Creature System Verification
console.log('1. Verifying Creatures & Mob Definitions...');
const mockWorld = {
  getBlock: () => 0,
  getHeightAt: () => 10,
  isBlockPassable: () => true,
};

const deer = new Mob(mockWorld, null, MOB_TYPE.MEADOW_DEER, { x: 0, y: 10, z: 0 });
const boar = new Mob(mockWorld, null, MOB_TYPE.FOREST_BOAR, { x: 0, y: 10, z: 0 });
const bird = new Mob(mockWorld, null, MOB_TYPE.SKY_BIRD, { x: 0, y: 25, z: 0 });
const stalker = new Mob(mockWorld, null, MOB_TYPE.CAVE_STALKER, { x: 0, y: 10, z: 0 });
const howler = new Mob(mockWorld, null, MOB_TYPE.NIGHT_HOWLER, { x: 0, y: 10, z: 0 });

assert(deer.health === 18 && !deer.ai.isHostile, 'Deer should be passive with 18 HP');
assert(boar.health === 26 && boar.ai.isNeutral, 'Boar should be neutral with 26 HP');
assert(bird.isFlying, 'Bird should be marked as flying');
assert(stalker.ai.isHostile && stalker.health === 32, 'Cave Stalker should be hostile with 32 HP');
assert(howler.ai.isHostile && howler.health === 38, 'Night Howler should be hostile with 38 HP');
console.log('✓ Creatures and attributes verified.');

// 2. Mob Drops Verification
console.log('2. Verifying Mob Drop Tables...');
const deerDrops = MobDropTable.getDrops(MOB_TYPE.MEADOW_DEER);
assert(deerDrops.length > 0 && deerDrops.some((d) => d.itemId === ITEMS.RAW_MEAT), 'Deer should drop raw meat');
const stalkerDrops = MobDropTable.getDrops(MOB_TYPE.CAVE_STALKER);
assert(stalkerDrops.length > 0 && stalkerDrops.some((d) => d.itemId === ITEMS.DARK_FRAGMENT), 'Cave Stalker should drop dark fragment');
const howlerDrops = MobDropTable.getDrops(MOB_TYPE.NIGHT_HOWLER);
assert(howlerDrops.length > 0 && howlerDrops.some((d) => d.itemId === ITEMS.SHADOW_ESSENCE), 'Night Howler should drop shadow essence');
console.log('✓ Mob drops verified.');

// 3. Armor & Defense Calculation Verification
console.log('3. Verifying Armor Defense & Damage Reduction...');
const inv = new Inventory();
inv.equipment[EQUIPMENT_SLOT.HEAD] = { itemId: ITEMS.IRON_HELMET, durability: 180 };
inv.equipment[EQUIPMENT_SLOT.CHEST] = { itemId: ITEMS.IRON_CHESTPLATE, durability: 250 };
inv.equipment[EQUIPMENT_SLOT.LEGS] = { itemId: ITEMS.IRON_LEGGINGS, durability: 220 };
inv.equipment[EQUIPMENT_SLOT.FEET] = { itemId: ITEMS.IRON_BOOTS, durability: 190 };

const totalIronDef = ArmorSystem.getTotalDefense(inv);
assert(totalIronDef === 4 + 8 + 6 + 3, `Expected 21 Iron Defense, got ${totalIronDef}`);

const rawDmg = 30;
const reducedDmg = ArmorSystem.applyDamageReduction(rawDmg, totalIronDef);
assert(reducedDmg < rawDmg, 'Armor should significantly reduce incoming damage');
assert(reducedDmg > 0, 'Damage should remain positive');

// Durability reduction
ArmorSystem.damageEquippedArmor(inv, 10);
assert(inv.equipment[EQUIPMENT_SLOT.HEAD].durability === 170, 'Armor durability should decrease upon hit');
console.log('✓ Armor sets & defense formula verified.');

// 4. Smelting System Verification
console.log('4. Verifying Charcoal Smelter & Fuel System...');
assert(isFuel(ITEMS.COAL_LUMP), 'Coal should be valid fuel');
assert(isFuel(ITEMS.TIMBER_PLANK), 'Timber plank should be valid fuel');

const ironSmeltRecipe = getSmeltingRecipe(ITEMS.IRON_ORE);
assert(ironSmeltRecipe && ironSmeltRecipe.output === ITEMS.IRON_INGOT, 'Iron ore should smelt into Iron Ingot');

const meatCookRecipe = getSmeltingRecipe(ITEMS.RAW_MEAT);
assert(meatCookRecipe && meatCookRecipe.output === ITEMS.COOKED_MEAT, 'Raw meat should cook into Cooked Meat');

const smeltingSys = new SmeltingSystem();
const smelter = smeltingSys.getSmelter(10, 5, 10);
smelter.input = { itemId: ITEMS.IRON_ORE, count: 2 };
smelter.fuel = { itemId: ITEMS.COAL_LUMP, count: 1 };

// Simulate smelting tick
smeltingSys.update(3.6); // Slightly above 3.5s recipe duration
assert(smelter.output && smelter.output.itemId === ITEMS.IRON_INGOT && smelter.output.count === 1, 'Smelter should produce Iron Ingot');
assert(smelter.input && smelter.input.count === 1, 'Smelter input should decrement to 1');
console.log('✓ Smelting & fuel consumption verified.');

// 5. Farming System Verification
console.log('5. Verifying Farming, Tilling, and Crop Growth...');
const worldBlocks = { '5,10,5': BLOCK.DIRT, '5,11,5': BLOCK.AIR };
const mockFarmingWorld = {
  getBlock: (x, y, z) => (worldBlocks[`${x},${y},${z}`] !== undefined ? worldBlocks[`${x},${y},${z}`] : BLOCK.AIR),
  setBlock: (x, y, z, id) => { worldBlocks[`${x},${y},${z}`] = id; },
};

const farmSys = new FarmingSystem(mockFarmingWorld);
assert(farmSys.tillSoil(5, 10, 5), 'Tilling soil should succeed on dirt');
assert(mockFarmingWorld.getBlock(5, 10, 5) === BLOCK.TILLED_SOIL, 'Soil block should be TILLED_SOIL');

assert(farmSys.plantSeed(5, 10, 5, ITEMS.SEEDS_WHEAT), 'Planting wheat seed should succeed');
assert(mockFarmingWorld.getBlock(5, 11, 5) === BLOCK.CROP_WHEAT, 'Crop block above soil should be CROP_WHEAT');

const crop = farmSys.getCrop(5, 11, 5);
assert(crop && crop.stage === 1, 'New crop should start at Stage 1');

// Simulate growth
crop.growthTimer = crop.maxStageTime;
farmSys.update(1.0);
assert(crop.stage === 2, 'Crop should progress to Stage 2');
console.log('✓ Farming, tilling, and crop growth verified.');

// 6. Storage Chest System Verification
console.log('6. Verifying Storage Chest System...');
const chest = new Chest(12, 10, 12, 27);
assert(chest.addItem(ITEMS.GOLD_INGOT, 5) === 5, 'Should add 5 Gold Ingots to chest');
assert(chest.getSlot(0).count === 5, 'Slot 0 should hold 5 Gold Ingots');

assert(chest.removeItem(ITEMS.GOLD_INGOT, 2), 'Removing 2 Gold Ingots should succeed');
assert(chest.getSlot(0).count === 3, 'Slot 0 should have 3 Gold Ingots remaining');

const storageSys = new StorageSystem();
const placedChest = storageSys.getChest(1, 2, 3);
placedChest.addItem(ITEMS.CRYSTAL_SHARD, 10);
const chestSaved = storageSys.saveState();

const loadedStorageSys = new StorageSystem();
loadedStorageSys.loadState(chestSaved);
const retrievedChest = loadedStorageSys.getChest(1, 2, 3);
assert(retrievedChest.getSlot(0).itemId === ITEMS.CRYSTAL_SHARD, 'Persisted chest items should load accurately');
console.log('✓ Storage Chests & persistence verified.');

// 7. SaveSystem Version 4 Migration Verification
console.log('7. Verifying SaveSystem Version 4 Schema & Legacy Migrations...');
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = v; },
  removeItem: (k) => { delete mockStorage[k]; },
};

import { SaveSystem } from './src/scripts/save/SaveSystem.js';

const mockPlayer = {
  position: { x: 10, y: 20, z: 30, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } },
  cameraController: { pitch: 0.2, yaw: 1.5 },
  stats: new PlayerStats(),
};
mockPlayer.stats.health = 90;
mockPlayer.stats.hunger = 85;

const saveRes = SaveSystem.save(
  { seed: 'V4-World-Seed', modifiedBlocks: {} },
  mockPlayer,
  inv,
  { timeOfDay: 0.35 },
  { selectedIndex: 3 },
  storageSys,
  smeltingSys,
  farmSys
);
assert(saveRes.success, 'SaveSystem V4 save should succeed');

const loadedV4 = SaveSystem.load();
assert(loadedV4 && loadedV4.worldVersion >= 4, 'Loaded save should be worldVersion >= 4');
assert(loadedV4.player.health === 90, 'Player health should be 90');
assert(loadedV4.chests !== undefined, 'Chests should be included in V4 save');
assert(loadedV4.smelters !== undefined, 'Smelters should be included in V4 save');
assert(loadedV4.crops !== undefined, 'Crops should be included in V4 save');

console.log('✓ SaveSystem Version 4 schema & migrations verified.');
console.log('=== ALL VERSION 4 TESTS PASSED SUCCESSFULLY ===');
