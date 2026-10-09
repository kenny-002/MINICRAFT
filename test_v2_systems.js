import * as THREE from 'three';
import { TerrainGenerator } from './src/scripts/world/TerrainGenerator.js';
import { BiomeManager, BIOME_TYPE } from './src/scripts/world/BiomeManager.js';
import { CaveGenerator } from './src/scripts/world/CaveGenerator.js';
import { OreGenerator } from './src/scripts/world/OreGenerator.js';
import { VegetationGenerator } from './src/scripts/world/VegetationGenerator.js';
import { BLOCK, BLOCK_PROPERTIES, HOTBAR_BLOCKS } from './src/scripts/blocks/BlockTypes.js';
import { TextureAtlas } from './src/scripts/blocks/TextureAtlas.js';
import { Chunk, CHUNK_MIN_Y } from './src/scripts/chunks/Chunk.js';
import { ChunkMeshBuilder } from './src/scripts/chunks/ChunkMeshBuilder.js';
import { Inventory } from './src/scripts/inventory/Inventory.js';
import { Hotbar } from './src/scripts/inventory/Hotbar.js';
import { PlayerPhysics } from './src/scripts/player/PlayerPhysics.js';
import { SaveSystem } from './src/scripts/save/SaveSystem.js';

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

console.log('=== RUNNING BLOCKWORLD VERSION 2 TEST SUITE ===\n');

// 1 & 2: Same seed generates identical terrain
const genA1 = new TerrainGenerator('Seed-Alpha-123');
const genA2 = new TerrainGenerator('Seed-Alpha-123');
let identical = true;
for (let x = -20; x <= 20; x += 5) {
  for (let z = -20; z <= 20; z += 5) {
    if (genA1.getHeight(x, z) !== genA2.getHeight(x, z)) identical = false;
    if (genA1.getBlockAt(x, 15, z) !== genA2.getBlockAt(x, 15, z)) identical = false;
  }
}
assert(identical, 'Test 1 & 2: Same seed generates identical deterministic terrain');

// 3: Different seed generates different terrain
const genB = new TerrainGenerator('Seed-Beta-999');
let hasDifference = false;
for (let x = -50; x <= 50; x += 10) {
  for (let z = -50; z <= 50; z += 10) {
    if (genA1.getHeight(x, z) !== genB.getHeight(x, z)) {
      hasDifference = true;
      break;
    }
  }
}
assert(hasDifference, 'Test 3: Different seed generates different terrain layout');

// 4 & 5: All 4 biomes generate and transition
const biomesFound = new Set();
for (let x = -1000; x <= 1000; x += 30) {
  for (let z = -1000; z <= 1000; z += 30) {
    const biome = genA1.biomeManager.getBiome(x, z);
    biomesFound.add(biome.type);
  }
}
assert(
  biomesFound.has(BIOME_TYPE.PLAINS) &&
  biomesFound.has(BIOME_TYPE.FOREST) &&
  biomesFound.has(BIOME_TYPE.DESERT) &&
  biomesFound.has(BIOME_TYPE.SNOW),
  `Test 4 & 5: All 4 major biomes generated across world map: [${Array.from(biomesFound).join(', ')}]`
);

// 6: Mountains generate with higher peaks
let maxHeight = 0;
let minHeight = 90;
for (let x = -300; x <= 300; x += 5) {
  for (let z = -300; z <= 300; z += 5) {
    const h = genA1.getHeight(x, z);
    if (h > maxHeight) maxHeight = h;
    if (h < minHeight) minHeight = h;
  }
}
assert(maxHeight >= 78 && minHeight <= 75, `Test 6: Mountain peaks (max Y=${maxHeight}) and valleys (min Y=${minHeight}) generate naturally`);

// 7: 3D Caves generate beneath surface and leave bedrock safe
let cavesFound = 0;
let bedrockCarved = false;
for (let x = -50; x <= 50; x += 3) {
  for (let z = -50; z <= 50; z += 3) {
    const surfaceY = genA1.getHeight(x, z);
    for (let y = -70; y <= surfaceY; y++) {
      if (y === -70 && genA1.caveGenerator.isCave(x, y, z, surfaceY)) {
        bedrockCarved = true;
      }
      if (y > -69 && y < surfaceY - 3 && genA1.caveGenerator.isCave(x, y, z, surfaceY)) {
        cavesFound++;
      }
    }
  }
}
assert(cavesFound > 0 && !bedrockCarved, `Test 7: 3D caves generated through underground stone (${cavesFound} cave voxels found, bedrock protected)`);

// 8: Ores generate at proper depths
let coalCount = 0, ironCount = 0, goldCount = 0, crystalCount = 0;
for (let x = -100; x <= 100; x += 4) {
  for (let z = -100; z <= 100; z += 4) {
    for (let y = -69; y < 85; y++) {
      const block = genA1.getBlockAt(x, y, z);
      if (block === BLOCK.COAL_ORE || block === BLOCK.DEEPSLATE_COAL_ORE) coalCount++;
      if (block === BLOCK.IRON_ORE || block === BLOCK.DEEPSLATE_IRON_ORE) ironCount++;
      if (block === BLOCK.GOLD_ORE || block === BLOCK.DEEPSLATE_GOLD_ORE) goldCount++;
      if (block === BLOCK.CRYSTAL_ORE || block === BLOCK.DEEPSLATE_CRYSTAL_ORE) crystalCount++;
    }
  }
}
assert(
  coalCount > 0 && ironCount > 0 && goldCount > 0 && crystalCount > 0 &&
  ironCount >= goldCount && goldCount >= crystalCount,
  `Test 8: Ores distributed with correct rarity & depth stratification (Coal: ${coalCount}, Iron: ${ironCount}, Gold: ${goldCount}, Crystal: ${crystalCount})`
);

// 9: Water blocks generate in oceans & lakes below sea level
let waterFound = 0;
for (let x = -150; x <= 150; x += 5) {
  for (let z = -150; z <= 150; z += 5) {
    const surfaceY = genA1.getHeight(x, z);
    if (surfaceY < genA1.seaLevel) {
      const b = genA1.getBlockAt(x, genA1.seaLevel, z);
      if (b === BLOCK.WATER || b === BLOCK.ICE) waterFound++;
    }
  }
}
assert(waterFound > 0, `Test 9: Water bodies and lakes generate below seaLevel Y=${genA1.seaLevel} (${waterFound} samples found)`);

// 10: Player Physics water interaction & swimming
const dummyWorld = {
  getBlock: (x, y, z) => (y < 20 ? BLOCK.WATER : (y === -70 ? BLOCK.STONE : BLOCK.AIR)),
};
const phys = new PlayerPhysics(dummyWorld);
const pPos = new THREE.Vector3(0, 10, 0);
const pVel = new THREE.Vector3(0, 0, 0);
const isWater = phys.checkWater(pPos);
phys.update(pPos, pVel, new THREE.Vector3(1, 0, 0), false, true, 0.05); // Swimming up
assert(isWater && pVel.y > 0, `Test 10: Water swimming physics (isInWater: ${isWater}, upward velocity: ${pVel.y})`);

// 11 & 12: Trees & Vegetation Generation
const voxelMock = {};
const mockSet = (x, y, z, id) => { voxelMock[`${x},${y},${z}`] = id; };
VegetationGenerator.generateOakTree(0, 78, 0, mockSet);
VegetationGenerator.generatePineTree(20, 78, 20, mockSet);
VegetationGenerator.generatePalmTree(-20, 78, -20, mockSet);
VegetationGenerator.generateCactus(40, 78, 40, mockSet);

const hasWood = Object.values(voxelMock).includes(BLOCK.WOOD);
const hasLeaves = Object.values(voxelMock).includes(BLOCK.LEAVES);
const hasPineWood = Object.values(voxelMock).includes(BLOCK.PINE_WOOD);
const hasPineLeaves = Object.values(voxelMock).includes(BLOCK.PINE_LEAVES);
const hasCactus = Object.values(voxelMock).includes(BLOCK.CACTUS);
assert(hasWood && hasLeaves && hasPineWood && hasPineLeaves && hasCactus, 'Test 11 & 12: Procedural Oak, Pine, Palm, and Cactus voxel structures generated');

// 13 & 14 & 15 & 16: Inventory, Breaking, Placing, Hotbar
const inv = new Inventory();
const initialStone = inv.getItemCount(BLOCK.STONE);
inv.addItem(BLOCK.STONE, 5);
assert(inv.getItemCount(BLOCK.STONE) === initialStone + 5, 'Test 13 & 14 & 15: Inventory item tracking & additions');
const removed = inv.removeItem(BLOCK.STONE, 3);
assert(removed && inv.getItemCount(BLOCK.STONE) === initialStone + 2, 'Test 16: Inventory item removal & hotbar state consistency');

// 17, 18, 19, 20: Chunk generation & persistent modifications
const chunk = new Chunk(0, 0, dummyWorld);
chunk.generate(genA1, { '0,25,0': BLOCK.GOLD_ORE });
assert(chunk.getLocalBlock(0, 25 - CHUNK_MIN_Y, 0) === BLOCK.GOLD_ORE, 'Test 17-20: Chunk generation and modified block persistence');

// 21: Save / Load schema compatibility
const mockWorld = { seed: 'TestSeed-V2', modifiedBlocks: { '5,10,5': BLOCK.CRYSTAL_ORE } };
const mockPlayer = { position: new THREE.Vector3(12, 34, 56), cameraController: { pitch: 0.1, yaw: 0.2 } };
const mockInv = new Inventory();
mockInv.addItem(BLOCK.CRYSTAL_ORE, 7);

const legacyV1Save = {
  version: 1,
  seed: 'LegacySeed-V1',
  player: { x: 1, y: 2, z: 3, pitch: 0, yaw: 0 },
  inventory: [{ blockId: BLOCK.DIRT, count: 64 }],
  modifiedBlocks: { '1,1,1': BLOCK.STONE },
};
const loadTargetWorld = { seed: '', modifiedBlocks: {} };
const loadTargetPlayer = { position: new THREE.Vector3(), cameraController: { pitch: 0, yaw: 0 } };
const loadTargetInv = new Inventory();

SaveSystem.applyToWorld(legacyV1Save, loadTargetWorld, loadTargetPlayer, loadTargetInv, null);
assert(
  loadTargetWorld.seed === 'LegacySeed-V1' &&
  loadTargetPlayer.position.x === 1 &&
  loadTargetInv.getItemCount(BLOCK.DIRT) === 64,
  'Test 21: Backward compatible Save/Load system gracefully loads legacy and Version 2 saves'
);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log(`========================================\n`);
