import assert from 'assert';
import { ItemRegistry, TOOL_TIERS, TOOL_TYPES, ITEMS } from './src/scripts/items/ItemTypes.js';
import { RECIPES, getRecipesByCategory, getRecipeById } from './src/scripts/crafting/RecipeRegistry.js';
import { CraftingSystem } from './src/scripts/crafting/CraftingSystem.js';
import { DropTable } from './src/scripts/items/DropTable.js';
import { PlayerStats } from './src/scripts/player/PlayerStats.js';
import { Inventory } from './src/scripts/inventory/Inventory.js';
import { Hotbar } from './src/scripts/inventory/Hotbar.js';
import { BLOCK } from './src/scripts/blocks/BlockTypes.js';

console.log('--- STARTING BLOCKWORLD VERSION 3 SYSTEM VERIFICATION SUITE ---');

// 1. Item Registry Verification
console.log('1. Verifying Item Registry...');
assert(ItemRegistry.has(ITEMS.WOOD_PICKAXE), 'wood_pickaxe should be registered');
assert(ItemRegistry.has(ITEMS.STONE_PICKAXE), 'stone_pickaxe should be registered');
assert(ItemRegistry.has(ITEMS.IRON_PICKAXE), 'iron_pickaxe should be registered');
assert(ItemRegistry.has(ITEMS.CRYSTAL_PICKAXE), 'crystal_pickaxe should be registered');

assert(ItemRegistry.has(ITEMS.WOOD_AXE), 'wood_axe should be registered');
assert(ItemRegistry.has(ITEMS.STONE_AXE), 'stone_axe should be registered');
assert(ItemRegistry.has(ITEMS.IRON_AXE), 'iron_axe should be registered');

assert(ItemRegistry.has(ITEMS.WOOD_SWORD), 'wood_sword should be registered');
assert(ItemRegistry.has(ITEMS.STONE_SWORD), 'stone_sword should be registered');
assert(ItemRegistry.has(ITEMS.IRON_SWORD), 'iron_sword should be registered');

assert(ItemRegistry.has(ITEMS.WILD_BERRIES), 'wild_berries should be registered');
assert(ItemRegistry.has(ITEMS.MUSHROOM_STEW), 'mushroom_stew should be registered');
assert(ItemRegistry.has(ITEMS.DESERT_FRUIT), 'desert_fruit should be registered');
assert(ItemRegistry.has(ITEMS.COOKED_RATION), 'cooked_ration should be registered');
assert(ItemRegistry.has(ITEMS.CRAFTING_BENCH), 'crafting_bench should be registered');
console.log('✓ Item Registry verified (Tools, Weapons, Food, Blocks, Resources).');

// 2. Tool Tier & Durability Verification
console.log('2. Verifying Tool Attributes & Tiers...');
const woodPick = ItemRegistry.get(ITEMS.WOOD_PICKAXE);
const stonePick = ItemRegistry.get(ITEMS.STONE_PICKAXE);
const ironPick = ItemRegistry.get(ITEMS.IRON_PICKAXE);
const crystalPick = ItemRegistry.get(ITEMS.CRYSTAL_PICKAXE);

assert(woodPick.durability === 60 && woodPick.toolTier === TOOL_TIERS.WOOD, 'Wood pickaxe durability/tier mismatch');
assert(stonePick.durability === 130 && stonePick.toolTier === TOOL_TIERS.STONE, 'Stone pickaxe durability/tier mismatch');
assert(ironPick.durability === 260 && ironPick.toolTier === TOOL_TIERS.IRON, 'Iron pickaxe durability/tier mismatch');
assert(crystalPick.durability === 520 && crystalPick.toolTier === TOOL_TIERS.CRYSTAL, 'Crystal pickaxe durability/tier mismatch');
assert(crystalPick.miningSpeed > ironPick.miningSpeed && ironPick.miningSpeed > stonePick.miningSpeed && stonePick.miningSpeed > woodPick.miningSpeed, 'Mining speed hierarchy failed');
console.log('✓ Tool Tiers & Durability progression verified.');

// 3. Drop Table & Tier Gating Verification
console.log('3. Verifying Drop Table & Tier Gating...');
// Coal Ore (Requires Wood tier)
const coalDropHand = DropTable.getDrops(BLOCK.COAL_ORE, TOOL_TIERS.HAND);
assert(coalDropHand.length === 0, 'Coal ore should NOT drop with bare hand');
const coalDropWood = DropTable.getDrops(BLOCK.COAL_ORE, TOOL_TIERS.WOOD);
assert(coalDropWood.length > 0 && coalDropWood[0].itemId === ITEMS.COAL_LUMP, 'Coal ore should drop coal_lump with wood pickaxe');

// Iron Ore (Requires Stone tier)
const ironDropWood = DropTable.getDrops(BLOCK.IRON_ORE, TOOL_TIERS.WOOD);
assert(ironDropWood.length === 0, 'Iron ore should NOT drop with wood pickaxe');
const ironDropStone = DropTable.getDrops(BLOCK.IRON_ORE, TOOL_TIERS.STONE);
assert(ironDropStone.length > 0 && (ironDropStone[0].itemId === ITEMS.IRON_ORE || ironDropStone[0].itemId === ITEMS.IRON_INGOT), 'Iron ore should drop iron ore/ingot with stone pickaxe');

// Crystal Ore (Requires Iron tier)
const crystalDropStone = DropTable.getDrops(BLOCK.CRYSTAL_ORE, TOOL_TIERS.STONE);
assert(crystalDropStone.length === 0, 'Crystal ore should NOT drop with stone pickaxe');
const crystalDropIron = DropTable.getDrops(BLOCK.CRYSTAL_ORE, TOOL_TIERS.IRON);
assert(crystalDropIron.length > 0 && (crystalDropIron[0].itemId === ITEMS.CRYSTAL_SHARD || crystalDropIron[0].itemId === ITEMS.CRYSTAL_ORE), 'Crystal ore should drop crystal with iron pickaxe');

// Crafting Bench block drops crafting_bench item
const benchDrop = DropTable.getDrops(BLOCK.CRAFTING_BENCH, TOOL_TIERS.HAND);
assert(benchDrop.length > 0 && benchDrop[0].itemId === ITEMS.CRAFTING_BENCH, 'Crafting bench should drop crafting_bench item');
console.log('✓ Drop Table & Tier prerequisites verified.');

// 4. Crafting System Verification
console.log('4. Verifying Crafting System & Recipes...');
const inv = new Inventory();
const crafting = new CraftingSystem(inv);

// Add 4 wood logs
inv.addItem(ITEMS.WOOD, 4);
assert(crafting.canCraft('recipe_timber_planks_oak', false), 'Should be able to field craft wood planks');
assert(crafting.craft('recipe_timber_planks_oak', false), 'Crafting wood planks should succeed');
assert(inv.hasItem(ITEMS.TIMBER_PLANK, 4), 'Should have 4 wood planks');
assert(inv.getItemCount(ITEMS.WOOD) === 3, 'Should have 3 wood logs remaining');

// Craft fiber sticks
assert(crafting.canCraft('recipe_fiber_sticks', false), 'Should be able to field craft sticks');
assert(crafting.craft('recipe_fiber_sticks', false), 'Crafting sticks should succeed');
assert(inv.hasItem(ITEMS.FIBER_STICK, 4), 'Should have 4 sticks');

// Craft more planks for bench
assert(crafting.craft('recipe_timber_planks_oak', false), 'Crafting more wood planks should succeed');

// Craft Crafting Bench
assert(crafting.canCraft('recipe_crafting_bench', false), 'Should be able to craft bench');
assert(crafting.craft('recipe_crafting_bench', false), 'Bench craft should succeed');
assert(inv.hasItem(ITEMS.CRAFTING_BENCH, 1), 'Should have 1 crafting bench');

// Try crafting Stone Pickaxe without bench (requires requiresBench = true)
inv.addItem(ITEMS.STONE, 3);
assert(!crafting.canCraft('recipe_stone_pickaxe', false), 'Stone pickaxe should NOT be craftable without workbench');
assert(crafting.canCraft('recipe_stone_pickaxe', true), 'Stone pickaxe SHOULD be craftable at workbench');
assert(crafting.craft('recipe_stone_pickaxe', true), 'Crafting stone pickaxe at workbench should succeed');
assert(inv.hasItem(ITEMS.STONE_PICKAXE, 1), 'Should have stone pickaxe in inventory');
console.log('✓ Crafting System & Workbench gating verified.');

// 5. Player Stats & Survival Mechanics
console.log('5. Verifying Player Stats (Health, Hunger, Fall Damage, Eating)...');
const stats = new PlayerStats();
assert(stats.health === 100 && stats.hunger === 100, 'Initial stats should be 100 HP, 100 Hunger');

// Test damage
stats.takeDamage(30, 'monster');
assert(stats.health === 70, 'Health should be 70 after 30 damage');

// Test Hunger drain
stats.drainHunger(40);
assert(stats.hunger === 60, 'Hunger should be 60');

// Test Eating
const berries = ItemRegistry.get(ITEMS.WILD_BERRIES);
assert(stats.eat(berries), 'Eating berries should succeed');
assert(stats.hunger === 75, 'Hunger should be restored by 15');

// Test Full Hunger eating prevention
stats.hunger = 100;
assert(!stats.eat(berries), 'Should not allow eating when hunger is at max (100)');

// Test Natural Healing at high hunger
stats.health = 80;
stats.hunger = 95;
stats.update(4.0); // 4 seconds tick
assert(stats.health > 80, 'Player should heal naturally when hunger >= 80');

// Test Starvation at 0 hunger
stats.hunger = 0;
const hpBeforeStarve = stats.health;
stats.update(5.0); // 5 seconds tick
assert(stats.health < hpBeforeStarve, 'Player should take starvation damage when hunger is 0');

// Test Fall Damage calculation
assert(stats.calculateFallDamage(-5) === 0, 'Small fall (-5 m/s) should deal 0 damage');
assert(stats.calculateFallDamage(-16) > 0, 'Medium fall (-16 m/s) should deal damage');
assert(stats.calculateFallDamage(-35) >= 100, 'Extreme fall (-35 m/s) should deal fatal damage');
console.log('✓ Player Stats, Hunger, Natural Healing & Fall Damage verified.');

// 6. Tool Durability & Wear
console.log('6. Verifying Hotbar & Durability reduction...');
const hotbar = new Hotbar(inv);
const slotIdx = inv.findItemSlot(ITEMS.STONE_PICKAXE);
assert(slotIdx !== -1, 'Stone pickaxe slot should be found');
const originalDurability = inv.slots[slotIdx].durability;
assert(originalDurability === 130, 'Stone pickaxe initial durability should be 130');

inv.reduceDurability(slotIdx, 1);
assert(inv.slots[slotIdx].durability === 129, 'Durability should decrease to 129');

// 7. SaveSystem & Backward Compatibility Verification
console.log('7. Verifying SaveSystem & Backward Compatibility...');
// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = v; },
  removeItem: (k) => { delete mockStorage[k]; },
};

import { SaveSystem } from './src/scripts/save/SaveSystem.js';

// Test 7a: Save V3 format
const mockWorld = { seed: 'Test-Seed-42', modifiedBlocks: { '0,10,0': 3 } };
const mockPlayer = {
  position: { x: 5, y: 15, z: 25, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } },
  cameraController: { pitch: 0.1, yaw: 1.2 },
  stats: new PlayerStats(),
};
mockPlayer.stats.health = 85;
mockPlayer.stats.hunger = 70;

const saveResult = SaveSystem.save(mockWorld, mockPlayer, inv, { timeOfDay: 0.5 }, hotbar);
assert(saveResult.success, 'SaveSystem.save should succeed');

const loadedV3 = SaveSystem.load();
assert(loadedV3 && loadedV3.worldVersion >= 3, 'Loaded save should be worldVersion >= 3');
assert(loadedV3.player.health === 85, 'Health should be persisted as 85');
assert(loadedV3.player.hunger === 70, 'Hunger should be persisted as 70');
assert(loadedV3.seed === 'Test-Seed-42', 'Seed should match');

// Test 7b: V2 Legacy Save loading
SaveSystem.clearSave();
mockStorage[SaveSystem.V2_SAVE_KEY] = JSON.stringify({
  worldVersion: 2,
  seed: 'Legacy-V2-Seed',
  player: { x: 1, y: 2, z: 3, pitch: 0, yaw: 0 },
  inventory: [{ slot: 0, itemId: 'block_stone', count: 10, durability: null }],
  modifiedBlocks: {},
  timeOfDay: 0.25,
});

const loadedV2 = SaveSystem.load();
assert(loadedV2 && loadedV2.worldVersion === 2, 'V2 legacy save should load');
assert(loadedV2.seed === 'Legacy-V2-Seed', 'V2 seed should load');

// Test 7c: V1 Legacy Save loading
SaveSystem.clearSave();
mockStorage[SaveSystem.LEGACY_SAVE_KEY] = JSON.stringify({
  seed: 'Legacy-V1-Seed',
  player: { x: 10, y: 20, z: 30 },
  inventory: [{ slot: 0, blockId: 1, count: 5 }],
});

const loadedV1 = SaveSystem.load();
assert(loadedV1 && loadedV1.worldVersion === 1, 'V1 legacy save should load with worldVersion 1');
assert(loadedV1.seed === 'Legacy-V1-Seed', 'V1 seed should load');
console.log('✓ SaveSystem V3 persistence & legacy V1/V2 migrations verified.');

console.log('=== ALL VERSION 3 TESTS PASSED SUCCESSFULLY ===');

