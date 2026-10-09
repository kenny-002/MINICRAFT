import http from 'http';

async function testV61SaveSystem() {
  console.log('🧪 Starting MINICRAFT V6.1 Save System & World Folder Verification...');

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

  // Reload page
  console.log('\n1. Reloading Page & Initializing...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1200));

  // Dismiss splash to reach main menu
  await evaluate(`
    (() => {
      if (window.game && window.game.ui) {
        window.game.ui.dismissSplash();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // 1. Clean slate & Verify IndexedDB DB initialization
  console.log('\n2. Verifying IndexedDB Initialization & Schema...');
  const initCheck = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      await SaveSystem.clearAllWorlds();
      const worlds = await SaveSystem.listWorlds();
      return {
        hasSaveSystem: typeof SaveSystem.save === 'function',
        hasListWorlds: Array.isArray(worlds),
        worldCount: worlds.length,
        indexedDbSupported: !!window.indexedDB,
      };
    })()
  `);
  console.log('SaveSystem status:', JSON.stringify(initCheck));
  if (!initCheck.hasSaveSystem || !initCheck.indexedDbSupported) {
    throw new Error('IndexedDB / SaveSystem failed initialization');
  }

  // 2. Create World 1: "Alpha Survival" with Seed "ALPHA-123"
  console.log('\n3. Creating World 1: "Alpha Survival"...');
  const world1Result = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const game = window.game;
      await game.startNewWorld('ALPHA-123', 'Alpha Survival');
      
      // Collect some items in inventory
      game.inventory.addItem(2, 10); // 10 Wood
      game.inventory.addItem(3, 5);  // 5 Stone
      
      // Modify a block
      game.world.setBlock(10, 15, 10, 2);
      
      // Spawn a dropped item
      game.itemDrops.spawnDrop(2, 3, 10, 16, 10);
      
      // Save current world
      await game.saveCurrentState();
      
      const record = await SaveSystem.getWorld(SaveSystem.activeWorldId);
      return {
        id: record.id,
        name: record.name,
        seed: record.seed,
        invSlot0: record.inventory[0],
        invSlot1: record.inventory[1],
        dropCount: record.itemDrops.length,
        modifiedBlockCount: Object.keys(record.modifiedBlocks || {}).length,
      };
    })()
  `);
  console.log('World 1 Created & Saved:', JSON.stringify(world1Result));
  if (world1Result.name !== 'Alpha Survival' || world1Result.seed !== 'ALPHA-123' || world1Result.dropCount < 1) {
    throw new Error('World 1 data mismatch: ' + JSON.stringify(world1Result));
  }

  // 3. Create World 2: "Beta Plains" with Seed "BETA-789"
  console.log('\n4. Creating World 2: "Beta Plains"...');
  const world2Result = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const game = window.game;
      
      // Create new world
      await game.startNewWorld('BETA-789', 'Beta Plains');
      
      // Verify World 2 starts with fresh/empty inventory
      const initialSlot0 = game.inventory.slots[0];
      
      // Add distinct item in World 2
      game.inventory.addItem(15, 64); // 64 Torches
      
      await game.saveCurrentState();
      
      const record = await SaveSystem.getWorld(SaveSystem.activeWorldId);
      return {
        id: record.id,
        name: record.name,
        seed: record.seed,
        startedEmpty: initialSlot0 === null,
        invSlot0: record.inventory[0],
        dropCount: record.itemDrops.length,
      };
    })()
  `);
  console.log('World 2 Created & Saved:', JSON.stringify(world2Result));
  if (world2Result.name !== 'Beta Plains' || !world2Result.startedEmpty || world2Result.dropCount !== 0) {
    throw new Error('World 2 isolation failed: ' + JSON.stringify(world2Result));
  }

  // 4. Verify Both Worlds exist in listWorlds and in UI
  console.log('\n5. Verifying World Selection List UI & Storage Independence...');
  const listCheck = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const worlds = await SaveSystem.listWorlds();
      window.game.ui.renderSavedWorlds();
      await new Promise(r => setTimeout(r, 200));
      
      const domCards = Array.from(document.querySelectorAll('.world-card')).map(card => {
        return {
          id: card.dataset.worldId,
          name: card.querySelector('.world-card-title')?.textContent,
          meta: card.querySelector('.world-card-meta')?.textContent,
        };
      });
      
      return {
        worldsInDb: worlds.map(w => ({ id: w.id, name: w.name, seed: w.seed })),
        domCards,
      };
    })()
  `);
  console.log('World List in DB & DOM:', JSON.stringify(listCheck, null, 2));
  if (listCheck.worldsInDb.length < 2 || listCheck.domCards.length < 2) {
    throw new Error('Expected at least 2 saved worlds');
  }

  // 5. Load World 1 again, verify World 1 data is preserved and not overwritten by World 2
  console.log('\n6. Loading World 1 ("Alpha Survival") and verifying data fidelity...');
  const reloadWorld1 = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const game = window.game;
      
      const alphaWorld = (await SaveSystem.listWorlds()).find(w => w.name === 'Alpha Survival');
      if (!alphaWorld) throw new Error('Alpha Survival world not found');
      
      await game.loadWorldById(alphaWorld.id);
      
      return {
        loadedWorldId: SaveSystem.activeWorldId,
        loadedSeed: game.world.seed,
        invSlot0: game.inventory.slots[0],
        invSlot1: game.inventory.slots[1],
        dropCount: game.itemDrops.drops.length,
        modifiedBlockAt10_15_10: game.world.getBlock(10, 15, 10),
      };
    })()
  `);
  console.log('World 1 Reloaded:', JSON.stringify(reloadWorld1));
  const isAlphaItem0Valid = reloadWorld1.invSlot0?.itemId === 'block_dirt' || reloadWorld1.invSlot0?.itemId === 2;
  if (reloadWorld1.loadedSeed !== 'ALPHA-123' || !isAlphaItem0Valid || reloadWorld1.dropCount < 1) {
    throw new Error('World 1 data integrity check failed on reload: ' + JSON.stringify(reloadWorld1));
  }

  // 6. Test Rename World
  console.log('\n7. Testing Rename World...');
  const renameResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const alphaWorld = (await SaveSystem.listWorlds()).find(w => w.name === 'Alpha Survival');
      const renamed = await SaveSystem.renameWorld(alphaWorld.id, 'Alpha Renamed');
      const updated = await SaveSystem.getWorld(alphaWorld.id);
      return {
        success: renamed,
        newName: updated.name,
      };
    })()
  `);
  console.log('Rename Result:', JSON.stringify(renameResult));
  if (!renameResult.success || renameResult.newName !== 'Alpha Renamed') {
    throw new Error('Rename world failed');
  }

  // 7. Test Duplicate World
  console.log('\n8. Testing Duplicate World...');
  const duplicateResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const alphaWorld = (await SaveSystem.listWorlds()).find(w => w.name === 'Alpha Renamed');
      const copy = await SaveSystem.duplicateWorld(alphaWorld.id);
      const worlds = await SaveSystem.listWorlds();
      return {
        copyId: copy.id,
        copyName: copy.name,
        copySeed: copy.seed,
        totalWorlds: worlds.length,
      };
    })()
  `);
  console.log('Duplicate Result:', JSON.stringify(duplicateResult));
  if (!duplicateResult.copyName.includes('Copy') || duplicateResult.copySeed !== 'ALPHA-123') {
    throw new Error('Duplicate world failed');
  }

  // 8. Test Export World JSON Structure
  console.log('\n9. Testing Export World format and 6-file manifest structure...');
  const exportResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const alphaWorld = (await SaveSystem.listWorlds()).find(w => w.name === 'Alpha Renamed');
      const jsonStr = await SaveSystem.exportWorldJSON(alphaWorld.id);
      const parsed = JSON.parse(jsonStr);
      return {
        schemaVersion: parsed.schemaVersion,
        hasManifest: !!parsed.manifest,
        files: Object.keys(parsed.files || {}),
        metadataName: parsed.files?.['metadata.json']?.name,
        seed: parsed.files?.['world.json']?.seed,
      };
    })()
  `);
  console.log('Export Result:', JSON.stringify(exportResult, null, 2));
  const expectedFiles = ['metadata.json', 'world.json', 'player.json', 'inventory.json', 'entities.json', 'item_drops.json'];
  for (const ef of expectedFiles) {
    if (!exportResult.files.includes(ef)) {
      throw new Error(`Missing expected file ${ef} in exported world format`);
    }
  }

  // 9. Test Import World
  console.log('\n10. Testing Import World...');
  const importResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const alphaWorld = (await SaveSystem.listWorlds()).find(w => w.name === 'Alpha Renamed');
      const jsonStr = await SaveSystem.exportWorldJSON(alphaWorld.id);
      
      // Import the world JSON
      const imported = await SaveSystem.importWorld(jsonStr);
      const worlds = await SaveSystem.listWorlds();
      return {
        importedId: imported.id,
        importedName: imported.name,
        importedSeed: imported.seed,
        totalWorlds: worlds.length,
      };
    })()
  `);
  console.log('Import Result:', JSON.stringify(importResult));
  if (!importResult.importedId || importResult.importedSeed !== 'ALPHA-123') {
    throw new Error('Import world failed');
  }

  // 10. Test Delete World
  console.log('\n11. Testing Delete World...');
  const deleteResult = await evaluate(`
    (async () => {
      const SaveSystem = window.SaveSystem;
      const initialCount = (await SaveSystem.listWorlds()).length;
      await SaveSystem.deleteWorld('${duplicateResult.copyId}');
      const afterCount = (await SaveSystem.listWorlds()).length;
      return {
        initialCount,
        afterCount,
        success: afterCount === initialCount - 1,
      };
    })()
  `);
  console.log('Delete Result:', JSON.stringify(deleteResult));
  if (!deleteResult.success) {
    throw new Error('Delete world failed');
  }

  // 11. Test Visual Saving Indicator HUD
  console.log('\n12. Testing Saving Indicator HUD...');
  const indicatorCheck = await evaluate(`
    (async () => {
      const indicator = document.getElementById('saving-indicator');
      const wasVisibleBefore = indicator ? indicator.classList.contains('visible') : false;
      
      // Trigger save
      const savePromise = window.game.saveCurrentState();
      const isVisibleDuring = indicator ? indicator.classList.contains('visible') : false;
      await savePromise;
      await new Promise(r => setTimeout(r, 1200));
      const isVisibleAfter = indicator ? indicator.classList.contains('visible') : false;
      
      return {
        indicatorExists: !!indicator,
        wasVisibleBefore,
        isVisibleDuring,
        isVisibleAfter,
        indicatorText: indicator ? indicator.textContent : '',
      };
    })()
  `);
  console.log('Indicator Check:', JSON.stringify(indicatorCheck));
  if (!indicatorCheck.indicatorExists) {
    throw new Error('Saving indicator element not found');
  }

  // 12. Test File System Access API adapter capabilities check
  console.log('\n13. Testing File System Adapter capabilities...');
  const fsCheck = await evaluate(`
    (async () => {
      const fs = window.SaveSystem.fs;
      return {
        isSupported: fs.hasFileSystemSupport(),
        hasSync: typeof fs.syncWorldToDirectory === 'function',
      };
    })()
  `);
  console.log('FileSystemAdapter Capabilities:', JSON.stringify(fsCheck));
  if (!fsCheck.hasSync) {
    throw new Error('Expected syncWorldToDirectory on FileSystemAdapter');
  }

  console.log('\n✅ ALL MINICRAFT V6.1 SAVE SYSTEM TESTS PASSED SUCCESSFULLY!');
  ws.close();
}

testV61SaveSystem().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
