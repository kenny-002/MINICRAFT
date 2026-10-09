// verify_placement_and_cracks.js
// Tests first-person block placement and progressive pixel-art damage crack animations in the live browser.

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.consoleErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else cb.resolve(msg.result);
        } else if (msg.method) {
          if (msg.method === 'Runtime.consoleAPICalled') {
            const type = msg.params.type;
            const text = msg.params.args.map(a => a.value !== undefined ? (typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)) : (a.description || JSON.stringify(a))).join(' ');
            this.consoleLogs.push({ type, text, timestamp: Date.now() });
            if (type === 'error') {
              this.consoleErrors.push(text);
            }
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'Unknown exception';
            this.consoleErrors.push(desc);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async sendKey(key, code, type = 'keyDown', modifiers = 0) {
    await this.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: code === 'KeyW' ? 87 : code === 'KeyS' ? 83 : code === 'KeyA' ? 65 : code === 'KeyD' ? 68 : code === 'KeyE' ? 69 : code === 'Space' ? 32 : code === 'ShiftLeft' ? 16 : 0,
      modifiers
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  console.log('=== BlockWorld V5.7 Block Placement & Damage Crack Animation Test ===');
  
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const page = targets.find(t => t.url.includes('5173') || t.title.includes('BlockWorld'));
  
  if (!page) {
    throw new Error('BlockWorld page not found on CDP port 9222');
  }
  
  console.log(`Connecting to page: "${page.title}" (${page.url})`);
  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.connect();
  
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Console.enable');

  console.log('\n--- 1. Reloading and Starting Game Session ---');
  await client.send('Page.reload', { ignoreCache: true });
  await sleep(1500);

  await client.evaluate(`
    const btn = document.getElementById('btn-continue') || document.getElementById('btn-new-world');
    if (btn) btn.click();
  `);
  await sleep(1000);

  const isPlaying = await client.evaluate(`window.game ? window.game.isPlaying : false`);
  console.log(`Game playing status: ${isPlaying}`);

  console.log('\n--- 2. Verifying BreakCrackAtlas Textures (10 Progressive Stages) ---');
  const atlasInfo = await client.evaluate(`
    (() => {
      const p = window.game.player;
      if (!p || !p.crackAtlas) return { error: 'No crackAtlas' };
      const stages = [];
      for (let i = 0; i < 10; i++) {
        const tex = p.crackAtlas.getTexture(i);
        stages.push({
          stage: i,
          hasTexture: !!tex,
          isCanvasTexture: !!tex?.image,
          filter: tex?.magFilter === 1003, // THREE.NearestFilter is 1003
          width: tex?.image?.width || 0,
          height: tex?.image?.height || 0
        });
      }
      return {
        stageCount: stages.length,
        hasCrackMesh: !!p.crackMesh,
        crackMeshVisible: p.crackMesh.visible,
        stages
      };
    })()
  `);
  console.log('Crack Atlas Inspection:', JSON.stringify(atlasInfo, null, 2));

  console.log('\n--- 3. Testing Block Placement (Dirt, Stone, Wood) ---');
  // Setup inventory hotbar items for testing: Slot 0 = DIRT (16), Slot 1 = STONE (8), Slot 2 = WOOD (5)
  await client.evaluate(`
    (() => {
      const g = window.game;
      g.inventory.setItemAt(0, 'block_dirt', 16);
      g.inventory.setItemAt(1, 'block_stone', 8);
      g.inventory.setItemAt(2, 'block_wood', 5);
      g.hotbar.select(0);
    })()
  `);

  // Position player directly looking at ground in front
  const placeResult = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;
      
      // Select slot 0 (Dirt, 16 count)
      g.hotbar.select(0);
      const slotBefore = g.hotbar.getSelectedSlot();
      const initialCount = slotBefore ? slotBefore.count : 0;
      
      // Place 2 blocks in front of the player (outside AABB)
      const tx = Math.floor(p.position.x) + 2;
      const ty = Math.floor(p.position.y) - 1;
      const tz = Math.floor(p.position.z);
      g.world.setBlock(tx, ty, tz, 2); // Dirt base

      p.targetedVoxel = {
        hit: true,
        blockId: 2,
        x: tx, y: ty, z: tz,
        faceNormal: { x: 0, y: 1, z: 0 },
        adjacent: { x: tx, y: ty + 1, z: tz }
      };

      const adj = p.targetedVoxel.adjacent;
      const blockBefore = g.world.getBlock(adj.x, adj.y, adj.z);

      // Perform placement
      const placed = p.placeBlock(g.hotbar.getSelectedBlockId());
      if (placed) {
        g.hotbar.consumeSelectedBlock();
      }

      const blockAfter = g.world.getBlock(adj.x, adj.y, adj.z);
      const slotAfter = g.hotbar.getSelectedSlot();
      const finalCount = slotAfter ? slotAfter.count : 0;

      return {
        placed,
        placedCoords: adj,
        blockBefore,
        blockAfter,
        initialCount,
        finalCount,
        countDecremented: finalCount === initialCount - 1
      };
    })()
  `);
  console.log('Dirt Placement Result:', JSON.stringify(placeResult, null, 2));

  // Test Stone placement from Slot 1
  const stonePlaceResult = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;
      g.hotbar.select(1); // Stone slot
      const initialCount = g.hotbar.getSelectedSlot().count;

      const tx = Math.floor(p.position.x) + 2;
      const ty = Math.floor(p.position.y);
      const tz = Math.floor(p.position.z);

      p.targetedVoxel = {
        hit: true,
        blockId: 2,
        x: tx, y: ty, z: tz,
        faceNormal: { x: 0, y: 1, z: 0 },
        adjacent: { x: tx, y: ty + 1, z: tz }
      };

      const placed = p.placeBlock(g.hotbar.getSelectedBlockId());
      if (placed) g.hotbar.consumeSelectedBlock();

      const blockAfter = g.world.getBlock(tx, ty + 1, tz);
      const finalCount = g.hotbar.getSelectedSlot().count;

      return {
        placed,
        blockAfter, // Expect 3 (BLOCK.STONE)
        initialCount,
        finalCount,
        countDecremented: finalCount === initialCount - 1
      };
    })()
  `);
  console.log('Stone Placement Result:', JSON.stringify(stonePlaceResult, null, 2));

  // Test Wood placement from Slot 2
  const woodPlaceResult = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;
      g.hotbar.select(2); // Wood slot
      const initialCount = g.hotbar.getSelectedSlot().count;

      const tx = Math.floor(p.position.x) + 3;
      const ty = Math.floor(p.position.y);
      const tz = Math.floor(p.position.z);

      p.targetedVoxel = {
        hit: true,
        blockId: 3,
        x: tx - 1, y: ty, z: tz,
        faceNormal: { x: 1, y: 0, z: 0 },
        adjacent: { x: tx, y: ty, z: tz }
      };

      const placed = p.placeBlock(g.hotbar.getSelectedBlockId());
      if (placed) g.hotbar.consumeSelectedBlock();

      const blockAfter = g.world.getBlock(tx, ty, tz);
      const finalCount = g.hotbar.getSelectedSlot().count;

      return {
        placed,
        blockAfter, // Expect 5 (BLOCK.WOOD)
        initialCount,
        finalCount,
        countDecremented: finalCount === initialCount - 1
      };
    })()
  `);
  console.log('Wood Placement Result:', JSON.stringify(woodPlaceResult, null, 2));

  console.log('\n--- 4. Testing Collision Prevention: Placing Inside Player AABB ---');
  const insidePlayerResult = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;
      g.hotbar.select(0);

      // Attempt to place block exactly at player's current body coordinate
      const px = Math.floor(p.position.x);
      const py = Math.floor(p.position.y);
      const pz = Math.floor(p.position.z);

      p.targetedVoxel = {
        hit: true,
        blockId: 1,
        x: px, y: py - 1, z: pz,
        faceNormal: { x: 0, y: 1, z: 0 },
        adjacent: { x: px, y: py, z: pz }
      };

      const placed = p.placeBlock(g.hotbar.getSelectedBlockId());
      return {
        attemptedCoords: { x: px, y: py, z: pz },
        placed,
        rejectedCorrectly: placed === false
      };
    })()
  `);
  console.log('Inside-Player Collision Rejection:', insidePlayerResult);

  console.log('\n--- 5. Testing Progressive Mining & Damage Crack Animation Stages ---');
  const miningProgression = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;

      // Set targeted block to a solid stone block
      const bx = Math.floor(p.position.x) + 2;
      const by = Math.floor(p.position.y);
      const bz = Math.floor(p.position.z);
      g.world.setBlock(bx, by, bz, 3); // Stone

      p.targetedVoxel = {
        hit: true,
        blockId: 3,
        x: bx, y: by, z: bz,
        faceNormal: { x: -1, y: 0, z: 0 },
        adjacent: { x: bx - 1, y: by, z: bz }
      };

      p.keys.mine = true;
      p.isMining = true;

      const observedStages = [];

      // Step through 10 increments of mining
      for (let step = 0; step <= 9; step++) {
        p.miningProgress = step / 10 + 0.05; // 0.05, 0.15, ... 0.95
        p._updateMining(0.016, g.hotbar);

        const currentStageIndex = Math.min(9, Math.floor(p.miningProgress * 10));
        observedStages.push({
          step,
          progress: Number(p.miningProgress.toFixed(2)),
          expectedStage: step,
          currentStageIndex,
          meshVisible: p.crackMesh.visible,
          meshPos: { x: p.crackMesh.position.x, y: p.crackMesh.position.y, z: p.crackMesh.position.z }
        });
      }

      // Finish breaking the block
      p.miningProgress = 1.0;
      p._updateMining(0.016, g.hotbar);

      const blockAfterBreak = g.world.getBlock(bx, by, bz);
      const meshVisibleAfterBreak = p.crackMesh.visible;

      return {
        observedStages,
        blockAfterBreak, // Expect 0 (BLOCK.AIR)
        meshVisibleAfterBreak // Expect false
      };
    })()
  `);
  console.log('Mining 10-Stage Progression & Finish:', JSON.stringify(miningProgression, null, 2));

  console.log('\n--- 6. Testing Mining Abort & Target Switch Reset ---');
  const abortResult = await client.evaluate(`
    (() => {
      const g = window.game;
      const p = g.player;

      // Start mining a block
      p.targetedVoxel = { hit: true, blockId: 1, x: 0, y: 20, z: 0, faceNormal: { x: 0, y: 1, z: 0 }, adjacent: { x: 0, y: 21, z: 0 } };
      p.keys.mine = true;
      p.isMining = true;
      p.miningProgress = 0.55;
      p._updateMining(0.016, g.hotbar);

      const visibleMidMining = p.crackMesh.visible;

      // Stop mining
      p.stopMining();

      const visibleAfterStop = p.crackMesh.visible;
      const progressAfterStop = p.miningProgress;

      return {
        visibleMidMining,
        visibleAfterStop,
        progressAfterStop,
        clearedCorrectly: !visibleAfterStop && progressAfterStop === 0
      };
    })()
  `);
  console.log('Mining Abort Reset Result:', abortResult);

  console.log('\n--- Final Console Error Summary ---');
  console.log(`Total Errors Logged: ${client.consoleErrors.length}`);
  if (client.consoleErrors.length > 0) {
    console.log('Errors:', client.consoleErrors);
  } else {
    console.log('PASS: Zero console errors recorded during placement and mining tests.');
  }

  client.close();
  console.log('\n=== All BlockWorld V5.7 Tests Complete ===');
}

runTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
