import { TerrainGenerator } from './src/scripts/world/TerrainGenerator.js';
import { OreGenerator } from './src/scripts/world/OreGenerator.js';
import { World } from './src/scripts/world/World.js';
import { Chunk, CHUNK_MIN_Y, CHUNK_MAX_Y, CHUNK_SIZE_Y } from './src/scripts/chunks/Chunk.js';
import { BLOCK, BLOCK_PROPERTIES } from './src/scripts/blocks/BlockTypes.js';
import { BIOME_TYPE } from './src/scripts/world/BiomeManager.js';
import { DropTable } from './src/scripts/items/DropTable.js';
import { ITEMS, TOOL_TIER } from './src/scripts/items/ItemTypes.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== TEST SUITE: MINICRAFT V8.5 — 9 EXACT WORLD LAYERS (Y = 80 to -70) ===\n');

// 1. Inspect Vertical Shaft from Y = 80 down to Y = -70
console.log('1. Vertical Shaft Layer Analysis Across Multiple Coordinates:');
const testSeeds = ['Seed-V85-Alpha', 'Seed-V85-Beta', 'Seed-V85-Gamma'];

testSeeds.forEach(seed => {
  const gen = new TerrainGenerator(seed);

  // Check shaft at (x=0, z=0)
  const shaft = [];
  for (let y = 80; y >= -70; y--) {
    shaft.push({ y, block: gen.getBlockAt(0, y, 0) });
  }

  function isAnyOre(b) {
    return (b >= BLOCK.COAL_ORE && b <= BLOCK.CRYSTAL_ORE) ||
           (b >= BLOCK.COPPER_ORE && b <= BLOCK.EMERALD_ORE) ||
           (b >= BLOCK.DEEPSLATE_COAL_ORE && b <= BLOCK.DEEPSLATE_EMERALD_ORE);
  }

  // Layer 9: Y = -70 Bedrock Floor
  const bedrockBlock = gen.getBlockAt(0, -70, 0);
  assert(bedrockBlock === BLOCK.BEDROCK, `[${seed}] Y = -70 is continuous Bedrock Floor`);

  // Layer 8: Y = -56 to -69 Ancient Lower Rock
  let l8Deepslate = 0;
  for (let y = -56; y >= -69; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.DEEPSLATE || b === BLOCK.BEDROCK || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l8Deepslate++;
    }
  }
  assert(l8Deepslate === 14, `[${seed}] Layer 8 (Y = -56..-69) is Ancient Lower Deep-Rock`);

  // Layer 7: Y = -36 to -55 Deep Underground
  let l7Deepslate = 0;
  for (let y = -36; y >= -55; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.DEEPSLATE || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l7Deepslate++;
    }
  }
  assert(l7Deepslate === 20, `[${seed}] Layer 7 (Y = -36..-55) is Deep Underground Deepslate`);

  // Layer 6: Y = -16 to -35 Deep-Rock Transition
  let l6Transition = 0;
  for (let y = -16; y >= -35; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.STONE || b === BLOCK.DEEPSLATE || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l6Transition++;
    }
  }
  assert(l6Transition === 20, `[${seed}] Layer 6 (Y = -16..-35) is Deep-Rock Transition (Stone & Deepslate mix)`);

  // Layer 5: Y = 14 to -15 Lower Stone
  let l5LowerStone = 0;
  for (let y = 14; y >= -15; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.STONE || b === BLOCK.TUFF || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l5LowerStone++;
    }
  }
  assert(l5LowerStone === 30, `[${seed}] Layer 5 (Y = 14..-15) is Lower Stone`);

  // Layer 4: Y = 39 to 15 Middle Stone
  let l4MiddleStone = 0;
  for (let y = 39; y >= 15; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.STONE || b === BLOCK.GRANITE || b === BLOCK.DIORITE || b === BLOCK.ANDESITE || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l4MiddleStone++;
    }
  }
  assert(l4MiddleStone === 25, `[${seed}] Layer 4 (Y = 39..15) is Middle Stone with Granite, Diorite, Andesite`);

  // Layer 3: Y = 64 to 40 Upper Stone
  let l3UpperStone = 0;
  for (let y = 64; y >= 40; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.STONE || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l3UpperStone++;
    }
  }
  assert(l3UpperStone === 25, `[${seed}] Layer 3 (Y = 64..40) is Upper Stone`);

  // Layer 2: Y = 74 to 65 Deep Soil & Gravel
  let l2Soil = 0;
  for (let y = 74; y >= 65; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.DIRT || b === BLOCK.GRAVEL || b === BLOCK.STONE || b === BLOCK.SAND || b === BLOCK.GRASS || b === BLOCK.SNOW || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER) {
      l2Soil++;
    }
  }
  assert(l2Soil === 10, `[${seed}] Layer 2 (Y = 74..65) is Deep Soil & Gravel`);

  // Layer 1: Y = 80 to 75 Surface & Topsoil
  let l1Surface = 0;
  for (let y = 80; y >= 75; y--) {
    const b = gen.getBlockAt(0, y, 0);
    if (b === BLOCK.GRASS || b === BLOCK.DIRT || b === BLOCK.SAND || b === BLOCK.SNOW || isAnyOre(b) || b === BLOCK.AIR || b === BLOCK.WATER || b === BLOCK.ICE) {
      l1Surface++;
    }
  }
  assert(l1Surface === 6, `[${seed}] Layer 1 (Y = 80..75) is Surface & Topsoil`);
});

// 2. Igneous Rock Pockets in Middle Stone & Lower Stone
console.log('\n2. Igneous & Volcanic Rock Pockets (Granite, Diorite, Andesite, Tuff):');
const genRock = new TerrainGenerator('Seed-Rock-Pockets');
let graniteCount = 0;
let dioriteCount = 0;
let andesiteCount = 0;
let tuffCount = 0;

for (let x = -60; x <= 60; x += 4) {
  for (let z = -60; z <= 60; z += 4) {
    // Middle stone layer 15..39
    for (let y = 15; y <= 39; y++) {
      const b = genRock.getBlockAt(x, y, z);
      if (b === BLOCK.GRANITE) graniteCount++;
      if (b === BLOCK.DIORITE) dioriteCount++;
      if (b === BLOCK.ANDESITE) andesiteCount++;
    }
    // Lower stone layer -15..14
    for (let y = -15; y <= 14; y++) {
      const b = genRock.getBlockAt(x, y, z);
      if (b === BLOCK.TUFF) tuffCount++;
    }
  }
}

assert(graniteCount > 0, `Granite pockets generate naturally in Middle Stone layer (${graniteCount} blocks)`);
assert(dioriteCount > 0, `Diorite pockets generate naturally in Middle Stone layer (${dioriteCount} blocks)`);
assert(andesiteCount > 0, `Andesite pockets generate naturally in Middle Stone layer (${andesiteCount} blocks)`);
assert(tuffCount > 0, `Tuff volcanic formations generate naturally in Lower Stone layer (${tuffCount} blocks)`);

// 3. World Negative Coordinate Operations (Raycasting, Set/Get, Chunks)
console.log('\n3. Negative Coordinate World Operations:');
const mockScene = { add: () => {}, remove: () => {} };
const world = new World(mockScene, 'Seed-World-Neg-Y');

// Test bounds
assert(world.getBlock(0, -70, 0) === BLOCK.BEDROCK, 'world.getBlock(0, -70, 0) returns BEDROCK');
assert(world.getBlock(0, -71, 0) === BLOCK.AIR, 'world.getBlock(0, -71, 0) out of bounds returns AIR');
assert(world.getBlock(0, 90, 0) === BLOCK.AIR, 'world.getBlock(0, 90, 0) out of bounds returns AIR');

// Test setBlock at negative Y
const setSuccess = world.setBlock(5, -45, 5, BLOCK.TORCH);
assert(setSuccess === true, 'world.setBlock(5, -45, 5, BLOCK.TORCH) succeeds at negative Y coordinate');
assert(world.getBlock(5, -45, 5) === BLOCK.TORCH, 'world.getBlock(5, -45, 5) immediately returns modified BLOCK.TORCH');

// 4. Statistical Distribution Across 9 Layers
console.log('\n4. 9-Layer Geological Ore & Mineral Distribution Statistics:');
const layerStats = {
  L1: { name: '1. Surface & Topsoil (Y=80..75)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L2: { name: '2. Deep Soil & Gravel (Y=74..65)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L3: { name: '3. Upper Stone (Y=64..40)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L4: { name: '4. Middle Stone (Y=39..15)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L5: { name: '5. Lower Stone (Y=14..-15)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L6: { name: '6. Deep-Rock Transition (Y=-16..-35)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L7: { name: '7. Deep Underground (Y=-36..-55)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L8: { name: '8. Ancient Lower Rock (Y=-56..-69)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
  L9: { name: '9. Bedrock Floor (Y=-70)', diamonds: 0, redstone: 0, lapis: 0, gold: 0, copper: 0, iron: 0, coal: 0, emerald: 0 },
};

testSeeds.forEach(seed => {
  const g = new TerrainGenerator(seed);
  for (let x = -50; x <= 50; x += 4) {
    for (let z = -50; z <= 50; z += 4) {
      for (let y = 80; y >= -70; y--) {
        const b = g.getBlockAt(x, y, z);
        let stat = null;
        if (y >= 75) stat = layerStats.L1;
        else if (y >= 65) stat = layerStats.L2;
        else if (y >= 40) stat = layerStats.L3;
        else if (y >= 15) stat = layerStats.L4;
        else if (y >= -15) stat = layerStats.L5;
        else if (y >= -35) stat = layerStats.L6;
        else if (y >= -55) stat = layerStats.L7;
        else if (y >= -69) stat = layerStats.L8;
        else stat = layerStats.L9;

        if (b === BLOCK.CRYSTAL_ORE || b === BLOCK.DEEPSLATE_CRYSTAL_ORE) stat.diamonds++;
        if (b === BLOCK.REDSTONE_ORE || b === BLOCK.DEEPSLATE_REDSTONE_ORE) stat.redstone++;
        if (b === BLOCK.LAPIS_ORE || b === BLOCK.DEEPSLATE_LAPIS_ORE) stat.lapis++;
        if (b === BLOCK.GOLD_ORE || b === BLOCK.DEEPSLATE_GOLD_ORE) stat.gold++;
        if (b === BLOCK.COPPER_ORE || b === BLOCK.DEEPSLATE_COPPER_ORE) stat.copper++;
        if (b === BLOCK.IRON_ORE || b === BLOCK.DEEPSLATE_IRON_ORE) stat.iron++;
        if (b === BLOCK.COAL_ORE || b === BLOCK.DEEPSLATE_COAL_ORE) stat.coal++;
        if (b === BLOCK.EMERALD_ORE || b === BLOCK.DEEPSLATE_EMERALD_ORE) stat.emerald++;
      }
    }
  }
});

console.log('\n================================================================================================================');
console.log('EXACT GEOLOGICAL LAYER                     | DIAMOND | REDSTONE | LAPIS | GOLD  | COPPER | IRON  | COAL  | EMERALD');
console.log('----------------------------------------------------------------------------------------------------------------');
for (const [key, stat] of Object.entries(layerStats)) {
  console.log(`${stat.name.padEnd(42)} | ${String(stat.diamonds).padEnd(7)} | ${String(stat.redstone).padEnd(8)} | ${String(stat.lapis).padEnd(5)} | ${String(stat.gold).padEnd(5)} | ${String(stat.copper).padEnd(6)} | ${String(stat.iron).padEnd(5)} | ${String(stat.coal).padEnd(5)} | ${String(stat.emerald)}`);
}
console.log('================================================================================================================\n');

assert(layerStats.L8.diamonds > 0 && layerStats.L7.diamonds > 0 && layerStats.L4.diamonds === 0, 'Diamonds concentrate in Layer 7 & Layer 8');
assert(layerStats.L8.redstone > 0 && layerStats.L7.redstone > 0 && layerStats.L3.redstone === 0, 'Redstone concentrates in Layer 7 & Layer 8');
assert(layerStats.L6.gold > 0 && layerStats.L5.gold > 0, 'Gold concentrates around Y = -16 (Layer 6)');
assert(layerStats.L5.lapis > 0 && layerStats.L4.lapis > 0, 'Lapis Lazuli concentrates around Y = 0 (Layer 5)');
assert(layerStats.L3.copper > layerStats.L7.copper, 'Copper peaks around Y = 48 (Layer 3)');
assert(layerStats.L1.emerald > 0 && layerStats.L7.emerald === 0, 'Emeralds generate in high mountains (Layer 1)');
assert(layerStats.L9.diamonds === 0 && layerStats.L9.iron === 0, 'Layer 9 (Bedrock Floor at Y = -70) has 0 ore overwrites');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
