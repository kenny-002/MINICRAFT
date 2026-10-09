import { TerrainGenerator } from './src/scripts/world/TerrainGenerator.js';
import { OreGenerator } from './src/scripts/world/OreGenerator.js';
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

console.log('=== TEST SUITE: MINICRAFT V8 & V8.1 VERTICAL GEOLOGY & REALISTIC ORE DISTRIBUTION ===\n');

// 1. Bedrock Layer Integrity & Unbreakability
console.log('1. Bedrock Floor Integrity & Unbreakability:');
const gen1 = new TerrainGenerator('Seed-V8-Alpha');
let bedrockCount = 0;
let totalBottomVoxels = 0;

for (let x = -32; x <= 32; x += 4) {
  for (let z = -32; z <= 32; z += 4) {
    totalBottomVoxels++;
    const b = gen1.getBlockAt(x, 0, z);
    if (b === BLOCK.BEDROCK) bedrockCount++;
  }
}
assert(bedrockCount === totalBottomVoxels, `Bedrock floor at Y=0 is 100% solid (tested ${totalBottomVoxels} coords across world)`);
assert(BLOCK_PROPERTIES[BLOCK.BEDROCK].unbreakable === true, 'Bedrock has unbreakable property');
assert(BLOCK_PROPERTIES[BLOCK.BEDROCK].hardness === Infinity, 'Bedrock has infinite hardness');
assert(DropTable.getRequiredTier(BLOCK.BEDROCK) > 100, 'Bedrock cannot be mined by any tool tier');

// 2. Vertical Geology Layers (Deepslate vs Stone vs Surface)
console.log('\n2. Vertical Geological Stratification:');
let deepslateAtY5 = 0;
let stoneAtY20 = 0;
let samples = 0;

for (let x = -40; x <= 40; x += 8) {
  for (let z = -40; z <= 40; z += 8) {
    samples++;
    const b5 = gen1.getBlockAt(x, 5, z);
    const b20 = gen1.getBlockAt(x, 20, z);
    const surfY = gen1.getHeight(x, z);

    // At Y=5, if not cave/water, it should be deepslate or deepslate ore
    if (b5 === BLOCK.DEEPSLATE || (b5 >= BLOCK.DEEPSLATE_COAL_ORE && b5 <= BLOCK.DEEPSLATE_EMERALD_ORE)) {
      deepslateAtY5++;
    }

    // At Y=20, underground stone layer
    if (20 < surfY - 4) {
      if (b20 === BLOCK.STONE || b20 === BLOCK.IRON_ORE || b20 === BLOCK.COPPER_ORE || b20 === BLOCK.COAL_ORE || b20 === BLOCK.LAPIS_ORE || b20 === BLOCK.GOLD_ORE || b20 === BLOCK.GRAVEL) {
        stoneAtY20++;
      }
    }
  }
}

assert(deepslateAtY5 > 0, `Deep underground at Y=5 uses Deepslate host rock (${deepslateAtY5}/${samples} samples)`);
assert(stoneAtY20 > 0, `Middle underground at Y=20 uses Basalt Stone host rock (${stoneAtY20} samples)`);

// 3. Biome-restricted Emerald Generation
console.log('\n3. Biome-Restricted Emerald Generation:');
const oreGen = new OreGenerator('Seed-Emerald-Test');
let snowEmeralds = 0;
let plainsEmeralds = 0;

const snowBiome = { type: BIOME_TYPE.SNOW, name: 'Snowy Peak' };
const plainsBiome = { type: BIOME_TYPE.PLAINS, name: 'Plains' };

for (let x = -50; x <= 50; x += 2) {
  for (let z = -50; z <= 50; z += 2) {
    for (let y = 36; y <= 58; y += 2) {
      const snowOre = oreGen.getOreAt(x, y, z, snowBiome, BLOCK.STONE);
      if (snowOre === BLOCK.EMERALD_ORE || snowOre === BLOCK.DEEPSLATE_EMERALD_ORE) {
        snowEmeralds++;
      }
      const plainsOre = oreGen.getOreAt(x, y, z, plainsBiome, BLOCK.STONE);
      if (plainsOre === BLOCK.EMERALD_ORE || plainsOre === BLOCK.DEEPSLATE_EMERALD_ORE) {
        plainsEmeralds++;
      }
    }
  }
}

assert(snowEmeralds > 0, `Emerald ores generate in mountain/snow biomes at high altitude (${snowEmeralds} veins found)`);
assert(plainsEmeralds === 0, `Emerald ores NEVER generate in plains biomes (found 0 in plains)`);

// 4. Statistical Depth Histogram across Multiple Seeds
console.log('\n4. Statistical Ore Histogram by Y-Level Across Seeds:');
const testSeeds = ['Seed-V8-Alpha', 'Seed-V8-Beta', 'Seed-V8-Gamma'];
const depthBins = {
  deep: { min: 1, max: 14, label: 'Deep (Y=1..14)', diamonds: 0, redstone: 0, iron: 0, copper: 0, lapis: 0, gold: 0, coal: 0, emerald: 0 },
  middle: { min: 15, max: 32, label: 'Middle (Y=15..32)', diamonds: 0, redstone: 0, iron: 0, copper: 0, lapis: 0, gold: 0, coal: 0, emerald: 0 },
  upper: { min: 33, max: 58, label: 'Upper/Mountain (Y=33..58)', diamonds: 0, redstone: 0, iron: 0, copper: 0, lapis: 0, gold: 0, coal: 0, emerald: 0 },
};

testSeeds.forEach(seed => {
  const g = new TerrainGenerator(seed);
  for (let x = -60; x <= 60; x += 4) {
    for (let z = -60; z <= 60; z += 4) {
      for (let y = 1; y <= 58; y++) {
        const b = g.getBlockAt(x, y, z);
        let bin = null;
        if (y <= 14) bin = depthBins.deep;
        else if (y <= 32) bin = depthBins.middle;
        else bin = depthBins.upper;

        if (b === BLOCK.CRYSTAL_ORE || b === BLOCK.DEEPSLATE_CRYSTAL_ORE) bin.diamonds++;
        if (b === BLOCK.REDSTONE_ORE || b === BLOCK.DEEPSLATE_REDSTONE_ORE) bin.redstone++;
        if (b === BLOCK.IRON_ORE || b === BLOCK.DEEPSLATE_IRON_ORE) bin.iron++;
        if (b === BLOCK.COPPER_ORE || b === BLOCK.DEEPSLATE_COPPER_ORE) bin.copper++;
        if (b === BLOCK.LAPIS_ORE || b === BLOCK.DEEPSLATE_LAPIS_ORE) bin.lapis++;
        if (b === BLOCK.GOLD_ORE || b === BLOCK.DEEPSLATE_GOLD_ORE) bin.gold++;
        if (b === BLOCK.COAL_ORE || b === BLOCK.DEEPSLATE_COAL_ORE) bin.coal++;
        if (b === BLOCK.EMERALD_ORE || b === BLOCK.DEEPSLATE_EMERALD_ORE) bin.emerald++;
      }
    }
  }
});

console.log('\n========================================================================================================');
console.log('DEPTH ZONE                  | DIAMOND | REDSTONE | LAPIS | GOLD  | COPPER | IRON  | COAL   | EMERALD');
console.log('--------------------------------------------------------------------------------------------------------');
for (const [key, bin] of Object.entries(depthBins)) {
  console.log(`${bin.label.padEnd(27)} | ${String(bin.diamonds).padEnd(7)} | ${String(bin.redstone).padEnd(8)} | ${String(bin.lapis).padEnd(5)} | ${String(bin.gold).padEnd(5)} | ${String(bin.copper).padEnd(6)} | ${String(bin.iron).padEnd(5)} | ${String(bin.coal).padEnd(6)} | ${String(bin.emerald)}`);
}
console.log('========================================================================================================\n');

assert(depthBins.deep.diamonds > depthBins.middle.diamonds && depthBins.upper.diamonds === 0, 'Diamonds peak deep underground and are absent at high elevation');
assert(depthBins.deep.redstone > depthBins.middle.redstone && depthBins.upper.redstone === 0, 'Redstone is concentrated deep underground');
assert(depthBins.middle.lapis > depthBins.upper.lapis, 'Lapis lazuli peaks at middle elevations');
assert(depthBins.middle.copper > depthBins.deep.copper, 'Copper peaks at middle elevations');
assert(depthBins.upper.coal > depthBins.deep.coal, 'Coal is most abundant in upper underground and mountain strata');
assert(depthBins.upper.emerald > 0 && depthBins.deep.emerald === 0, 'Emeralds generate exclusively in high-altitude mountain elevations');

// 5. Texture & Block Drops
console.log('\n5. Texture Mapping & Drop Table Integration:');
assert(BLOCK_PROPERTIES[BLOCK.DEEPSLATE].textures.top === 'deepslate_top', 'Deepslate top texture configured');
assert(BLOCK_PROPERTIES[BLOCK.DEEPSLATE].textures.north === 'deepslate_side', 'Deepslate side texture configured');
assert(BLOCK_PROPERTIES[BLOCK.COPPER_ORE].textures.top === 'copper_ore', 'Copper ore texture configured');
assert(BLOCK_PROPERTIES[BLOCK.REDSTONE_ORE].textures.top === 'redstone_ore', 'Redstone ore texture configured');
assert(BLOCK_PROPERTIES[BLOCK.LAPIS_ORE].textures.top === 'lapis_ore', 'Lapis ore texture configured');
assert(BLOCK_PROPERTIES[BLOCK.EMERALD_ORE].textures.top === 'emerald_ore', 'Emerald ore texture configured');

const ironDrops = DropTable.getDrops(BLOCK.DEEPSLATE_IRON_ORE, TOOL_TIER.STONE);
assert(ironDrops.length > 0 && ironDrops[0].itemId === ITEMS.IRON_ORE, 'Mining deepslate iron with stone pickaxe drops iron ore');

const redstoneDrops = DropTable.getDrops(BLOCK.DEEPSLATE_REDSTONE_ORE, TOOL_TIER.IRON);
assert(redstoneDrops.length > 0 && redstoneDrops[0].itemId === ITEMS.REDSTONE_DUST, 'Mining deepslate redstone with iron pickaxe drops redstone dust');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
