import http from 'http';

async function testV62BlockDrops() {
  console.log('🧪 Starting MINICRAFT V6.2 Block Breaking, Drop Spawning & Pickup Verification...');

  // Connect to Chrome target
  const targets = await fetch('http://localhost:9222/json').then(r => r.json());
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('5173')) || targets[0];
  if (!pageTarget) {
    throw new Error('No page target found on localhost:9222');
  }

  console.log(`Connected to page target: ${pageTarget.title} (${pageTarget.id})`);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  await new Promise(r => ws.addEventListener('open', r));

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
      // console.log(`[Browser Console ${msg.params.type}]:`, args);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
    }
  });

  // Reload page and dismiss splash
  console.log('\n1. Reloading Page & Preparing Fresh Session...');
  await send('Page.reload');
  
  // Wait for window.game to be available
  let ready = false;
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const isGameReady = await evaluate(`Boolean(window.game && window.game.startNewWorld && window.game.ui)`);
      if (isGameReady) {
        ready = true;
        break;
      }
    } catch (e) {
      // context may be reloading
    }
  }
  if (!ready) {
    const debugInfo = await evaluate(`({
      hasGame: typeof window.game !== 'undefined',
      hasUI: Boolean(window.game && window.game.ui),
      keys: window.game ? Object.keys(window.game) : []
    })`).catch(e => ({ error: e.message }));
    throw new Error('Timeout waiting for window.game to be initialized. Debug info: ' + JSON.stringify(debugInfo));
  }

  await evaluate(`
    (() => {
      if (window.game && window.game.ui) {
        window.game.ui.dismissSplash();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // Initialize a test survival world
  console.log('\n2. Initializing Test World...');
  await evaluate(`
    (async () => {
      await window.game.startNewWorld('TEST-DROPS-V62', 'Drops Test World');
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // Test 1: Authoritative Drop Table Validation for all major block types
  console.log('\n3. Validating DropTable mappings for all major blocks...');
  const dropTableTest = await evaluate(`
    (async () => {
      const { BLOCK } = await import('/src/scripts/blocks/BlockTypes.js');
      const { DropTable } = await import('/src/scripts/items/DropTable.js');
      const { TOOL_TIER } = await import('/src/scripts/items/ItemTypes.js');

      return {
        grass: DropTable.getDrops(BLOCK.GRASS, TOOL_TIER.HAND),
        dirt: DropTable.getDrops(BLOCK.DIRT, TOOL_TIER.HAND),
        wood: DropTable.getDrops(BLOCK.WOOD, TOOL_TIER.HAND),
        stoneWithHand: DropTable.getDrops(BLOCK.STONE, TOOL_TIER.HAND),
        stoneWithWoodPick: DropTable.getDrops(BLOCK.STONE, TOOL_TIER.WOOD),
        coalOreWithPick: DropTable.getDrops(BLOCK.COAL_ORE, TOOL_TIER.WOOD),
        ironOreWithHand: DropTable.getDrops(BLOCK.IRON_ORE, TOOL_TIER.HAND),
        ironOreWithPick: DropTable.getDrops(BLOCK.IRON_ORE, TOOL_TIER.STONE),
        crystalOreWithPick: DropTable.getDrops(BLOCK.CRYSTAL_ORE, TOOL_TIER.IRON),
        cactus: DropTable.getDrops(BLOCK.CACTUS, TOOL_TIER.HAND),
        torch: DropTable.getDrops(BLOCK.TORCH, TOOL_TIER.HAND),
        craftingBench: DropTable.getDrops(BLOCK.CRAFTING_BENCH, TOOL_TIER.HAND),
      };
    })()
  `);
  console.log('DropTable Mappings:', JSON.stringify(dropTableTest, null, 2));

  if (dropTableTest.dirt[0]?.itemId !== 'block_dirt') throw new Error('Dirt drop mismatch');
  if (dropTableTest.wood[0]?.itemId !== 'block_wood') throw new Error('Wood drop mismatch');
  if (dropTableTest.stoneWithHand.length !== 0) throw new Error('Stone should drop nothing without pickaxe');
  if (dropTableTest.stoneWithWoodPick[0]?.itemId !== 'block_stone') throw new Error('Stone with pickaxe mismatch');
  if (dropTableTest.coalOreWithPick[0]?.itemId !== 'mat_coal_lump') throw new Error('Coal ore drop mismatch');
  if (dropTableTest.ironOreWithHand.length !== 0) throw new Error('Iron ore should drop nothing without stone pickaxe');
  if (dropTableTest.ironOreWithPick[0]?.itemId !== 'block_iron_ore') throw new Error('Iron ore with stone pick mismatch');
  if (dropTableTest.crystalOreWithPick[0]?.itemId !== 'mat_crystal_shard') throw new Error('Crystal ore drop mismatch');
  console.log('✅ DropTable mapping tests passed');

  // Test 2: Breaking Dirt in World & Verifying Spawned 3D Drop
  console.log('\n4. Testing Real In-World Block Breaking (Dirt Block)...');
  const dirtBreakResult = await evaluate(`
    (async () => {
      const { BLOCK } = await import('/src/scripts/blocks/BlockTypes.js');
      const game = window.game;
      
      // Clean drops & clear inventory
      game.itemDrops.clear();
      game.inventory.clearAll();
      
      // Place a dirt block at (5, 12, 5)
      game.world.setBlock(5, 12, 5, BLOCK.DIRT);
      
      // Break the block
      game.player._finishMining(5, 12, 5, BLOCK.DIRT, 0, null);
      
      const remainingBlock = game.world.getBlock(5, 12, 5);
      const drops = game.itemDrops.drops;
      
      return {
        blockRemoved: remainingBlock === BLOCK.AIR,
        dropCount: drops.length,
        dropItemId: drops[0]?.itemId,
        dropQuantity: drops[0]?.count,
        dropPosX: drops[0]?.position.x,
        dropPosY: drops[0]?.position.y,
        dropPosZ: drops[0]?.position.z,
        hasFiniteCoords: Number.isFinite(drops[0]?.position.x) && Number.isFinite(drops[0]?.position.y),
      };
    })()
  `);
  console.log('Dirt Break Result:', JSON.stringify(dirtBreakResult, null, 2));
  if (!dirtBreakResult.blockRemoved || dirtBreakResult.dropCount !== 1 || dirtBreakResult.dropItemId !== 'block_dirt') {
    throw new Error('Dirt breaking failed to spawn drop or remove block');
  }
  console.log('✅ Dirt break and drop creation passed');

  // Test 3: True Voxel Underground Drop Physics (No Teleportation Bug)
  console.log('\n5. Testing Voxel Drop Physics in Deep Pit / Cave...');
  const undergroundPhysicsResult = await evaluate(`
    (async () => {
      const { BLOCK } = await import('/src/scripts/blocks/BlockTypes.js');
      const game = window.game;
      
      game.itemDrops.clear();
      
      // Create a deep vertical shaft: solid floor at y=4, open air at y=5, y=6, y=7
      game.world.setBlock(12, 4, 12, BLOCK.STONE);
      game.world.setBlock(12, 5, 12, BLOCK.AIR);
      game.world.setBlock(12, 6, 12, BLOCK.AIR);
      game.world.setBlock(12, 7, 12, BLOCK.DIRT);
      
      // Mine the block at y=7
      game.player._finishMining(12, 7, 12, BLOCK.DIRT, 0, null);
      
      // Simulate physics ticks
      for (let f = 0; f < 30; f++) {
        game.itemDrops.update(0.05, null, null, null, null);
      }
      
      const drop = game.itemDrops.drops[0];
      return {
        dropGrounded: drop?.isGrounded,
        finalY: drop?.position.y,
        expectedFloorY: 5.18, // resting on stone block y=4 (4 + 1.0 + 0.18)
        settledOnVoxelFloor: drop && Math.abs(drop.position.y - 5.18) < 0.1,
      };
    })()
  `);
  console.log('Underground Physics Result:', JSON.stringify(undergroundPhysicsResult, null, 2));
  if (!undergroundPhysicsResult.settledOnVoxelFloor) {
    throw new Error('Drop did not settle on voxel floor at bottom of pit: ' + JSON.stringify(undergroundPhysicsResult));
  }
  console.log('✅ Voxel underground collision physics passed (No heightmap sky-teleport)');

  // Test 4: Breaking Chest Drops Its Stored Items
  console.log('\n6. Testing Chest Breaking & Stored Item Drops...');
  const chestBreakResult = await evaluate(`
    (async () => {
      const { BLOCK } = await import('/src/scripts/blocks/BlockTypes.js');
      const game = window.game;
      
      game.itemDrops.clear();
      
      // Create and populate a chest at (15, 10, 15)
      game.world.setBlock(15, 10, 15, BLOCK.STORAGE_CHEST);
      const chest = game.storage.getChest(15, 10, 15);
      chest.addItem('mat_iron_ingot', 10);
      chest.addItem('food_wheat', 5);
      
      // Break the chest
      game.player._finishMining(15, 10, 15, BLOCK.STORAGE_CHEST, 0, null);
      
      const drops = game.itemDrops.drops.map(d => ({ itemId: d.itemId, count: d.count }));
      return {
        totalDrops: drops.length,
        drops,
      };
    })()
  `);
  console.log('Chest Break Drops:', JSON.stringify(chestBreakResult, null, 2));
  const hasChestItem = chestBreakResult.drops.some(d => d.itemId === 'block_storage_chest');
  const hasIronItem = chestBreakResult.drops.some(d => d.itemId === 'mat_iron_ingot' && d.count === 10);
  const hasWheatItem = chestBreakResult.drops.some(d => d.itemId === 'food_wheat' && d.count === 5);
  if (!hasChestItem || !hasIronItem || !hasWheatItem) {
    throw new Error('Chest breaking failed to drop its stored inventory contents');
  }
  console.log('✅ Chest destruction drop contents passed');

  // Test 5: Full Stack Player Pickup
  console.log('\n7. Testing Player Proximity Collection...');
  const pickupResult = await evaluate(`
    (async () => {
      const game = window.game;
      game.itemDrops.clear();
      game.inventory.clearAll();
      
      // Spawn drop at (20, 10, 20)
      game.itemDrops.spawnDrop('block_wood', 4, 20, 10, 20, null, { pickupDelay: 0 });
      
      // Position player at (20.5, 9.8, 20.5) (within pickup radius)
      game.player.position.set(20.5, 9.8, 20.5);
      
      // Update drop manager
      game.itemDrops.update(0.1, game.player, game.inventory, game.sound, game.ui);
      
      return {
        dropsRemaining: game.itemDrops.drops.length,
        invSlot0: game.inventory.getSlot(0),
      };
    })()
  `);
  console.log('Pickup Result:', JSON.stringify(pickupResult, null, 2));
  if (pickupResult.dropsRemaining !== 0 || pickupResult.invSlot0?.itemId !== 'block_wood' || pickupResult.invSlot0?.count !== 4) {
    throw new Error('Player failed to collect drop: ' + JSON.stringify(pickupResult));
  }
  console.log('✅ Player proximity collection passed');

  // Test 6: Partial Stack Collection (Limited Inventory Space)
  console.log('\n8. Testing Partial Stack Collection...');
  const partialPickupResult = await evaluate(`
    (async () => {
      const game = window.game;
      game.itemDrops.clear();
      game.inventory.clearAll();
      
      // Fill all 36 slots except slot 0 which has 60 wood (space for 4 more)
      for (let i = 1; i < 36; i++) {
        game.inventory.setSlot(i, 'block_stone', 64);
      }
      game.inventory.setSlot(0, 'block_wood', 60);
      
      // Spawn 10 wood on the ground
      game.itemDrops.spawnDrop('block_wood', 10, 25, 10, 25, null, { pickupDelay: 0 });
      
      // Position player on drop
      game.player.position.set(25, 9.8, 25);
      game.itemDrops.update(0.1, game.player, game.inventory, game.sound, game.ui);
      
      return {
        slot0Count: game.inventory.getSlot(0)?.count,
        dropsRemainingCount: game.itemDrops.drops.length,
        remainingDropItemCount: game.itemDrops.drops[0]?.count,
      };
    })()
  `);
  console.log('Partial Pickup Result:', JSON.stringify(partialPickupResult, null, 2));
  if (partialPickupResult.slot0Count !== 64 || partialPickupResult.remainingDropItemCount !== 6) {
    throw new Error('Partial stack collection failed: ' + JSON.stringify(partialPickupResult));
  }
  console.log('✅ Partial stack collection passed (Excess remains in world)');

  // Test 7: Full Inventory Collection Safeguard
  console.log('\n9. Testing Full Inventory Collection Safeguard...');
  const fullInvResult = await evaluate(`
    (async () => {
      const game = window.game;
      game.itemDrops.clear();
      game.inventory.clearAll();
      
      // Fill all 36 slots with maximum stacks
      for (let i = 0; i < 36; i++) {
        game.inventory.setSlot(i, 'block_stone', 64);
      }
      
      // Spawn a new item drop
      game.itemDrops.spawnDrop('block_dirt', 5, 30, 10, 30, null, { pickupDelay: 0 });
      
      // Position player directly on drop
      game.player.position.set(30, 9.8, 30);
      game.itemDrops.update(0.1, game.player, game.inventory, game.sound, game.ui);
      
      return {
        dropsCount: game.itemDrops.drops.length,
        dropItemCount: game.itemDrops.drops[0]?.count,
        dropItemId: game.itemDrops.drops[0]?.itemId,
      };
    })()
  `);
  console.log('Full Inventory Result:', JSON.stringify(fullInvResult, null, 2));
  if (fullInvResult.dropsCount !== 1 || fullInvResult.dropItemCount !== 5) {
    throw new Error('Item on ground was incorrectly destroyed with full inventory');
  }
  console.log('✅ Full inventory safeguard passed (No items lost)');

  // Test 8: Save & Reload Persistence of Uncollected Drops
  console.log('\n10. Testing Save and Reload Persistence of Active Drops...');
  const persistenceResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const game = window.game;
      
      game.itemDrops.clear();
      game.inventory.clearAll();
      
      // Spawn uncollected drops at specific coordinates
      game.itemDrops.spawnDrop('mat_gold_ingot', 7, 40.5, 15.2, 40.5);
      game.itemDrops.spawnDrop('mat_crystal_shard', 3, 42.1, 15.2, 42.1);
      
      // Save world state
      await game.saveCurrentState();
      
      // Clear world drops in memory
      game.itemDrops.clear();
      
      // Reload world
      await game.loadWorldById(SaveSystem.activeWorldId);
      
      const loadedDrops = game.itemDrops.drops.map(d => ({
        itemId: d.itemId,
        count: d.count,
        x: d.position.x,
        y: d.position.y,
        z: d.position.z,
      }));
      
      return {
        loadedCount: loadedDrops.length,
        loadedDrops,
      };
    })()
  `);
  console.log('Persistence Result:', JSON.stringify(persistenceResult, null, 2));
  const hasGold = persistenceResult.loadedDrops.some(d => d.itemId === 'mat_gold_ingot' && d.count === 7);
  const hasCrystal = persistenceResult.loadedDrops.some(d => d.itemId === 'mat_crystal_shard' && d.count === 3);
  if (!hasGold || !hasCrystal) {
    throw new Error('Drops failed to restore across save & reload: ' + JSON.stringify(persistenceResult));
  }
  console.log('✅ Uncollected item drops save/reload persistence passed');

  console.log('\n🎉 ALL MINICRAFT V6.2 BLOCK BREAKING & ITEM DROP TESTS PASSED SUCCESSFULLY!');
  ws.close();
}

export { testV62BlockDrops };

if (process.argv[1]?.endsWith('test_v62_block_drops.js')) {
  testV62BlockDrops().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
}

