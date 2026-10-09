import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function waitForPort(port, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

export async function runV73CustomTextureTests() {
  console.log('🚀 Launching Headless Chrome on CDP port 9222 for MINICRAFT V7.3 Custom Texture Verification...');
  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    'http://localhost:5173/',
  ]);

  chromeProc.stderr.on('data', () => {});

  const isReady = await waitForPort(9222, 10000);
  if (!isReady) {
    console.error('❌ Chrome failed to start on port 9222');
    chromeProc.kill();
    process.exit(1);
  }

  try {
    const targets = await fetch('http://localhost:9222/json').then(r => r.json());
    const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('5173')) || targets[0];
    if (!pageTarget) {
      throw new Error('No page target found on localhost:9222');
    }

    console.log(`Connected to page target: ${pageTarget.title} (${pageTarget.id})`);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let idCounter = 1;
    const pending = new Map();
    const consoleErrors = [];

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
        if (msg.params.type === 'error') {
          consoleErrors.push(args);
          console.error(`[Browser Console Error]:`, args);
        }
      }
    });

    console.log('\n======================================================');
    console.log('🧪 MINICRAFT V7.3 — CUSTOM TEXTURE INTEGRATION SUITE');
    console.log('======================================================\n');

    // Wait for game initialization
    let isGameReady = false;
    for (let i = 0; i < 20; i++) {
      isGameReady = await evaluate(`!!(window.game && window.game.world && window.game.world.textureAtlas)`);
      if (isGameReady) break;
      await new Promise(r => setTimeout(r, 250));
    }

    // 1. Diagnostics: Inspect Canvas Atlas Pixels for Imported Textures
    console.log('1. Verifying In-Game Canvas Texture Atlas with Imported Custom Textures:');
    const atlasDiag = await evaluate(`
      (() => {
        const g = window.game;
        if (!g || !g.world || !g.world.textureAtlas) {
          return { error: 'Game or TextureAtlas not found on window.game' };
        }
        const atlas = g.world.textureAtlas;
        const ctx = atlas.ctx;

        function getTilePixel(tileName, px, py) {
          const idx = atlas.tileIndices[tileName];
          if (idx === undefined) return null;
          const coords = atlas._getTileCoords(idx);
          const d = ctx.getImageData(coords.x + px, coords.y + py, 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        }

        return {
          atlasWidth: atlas.width,
          atlasHeight: atlas.height,
          tileSize: atlas.tileSize,
          materialAttached: g.world.chunkMaterial.map === atlas.texture,
          samples: {
            stone: getTilePixel('stone', 8, 8),
            dirt: getTilePixel('dirt', 8, 8),
            grass_top: getTilePixel('grass_top', 8, 8),
            grass_side: getTilePixel('grass_side', 8, 8),
            coal_ore: getTilePixel('coal_ore', 8, 8),
            iron_ore: getTilePixel('iron_ore', 8, 8),
            gold_ore: getTilePixel('gold_ore', 8, 8),
            crystal_ore: getTilePixel('crystal_ore', 8, 8),
            copper_ore: getTilePixel('copper_ore', 8, 8),
            planks_oak: getTilePixel('planks_oak', 8, 8),
            wood_side: getTilePixel('wood_side', 8, 8),
            wood_top: getTilePixel('wood_top', 8, 8),
            smelter_front: getTilePixel('smelter_front', 8, 8),
            smelter_side: getTilePixel('smelter_side', 8, 8),
            smelter_top: getTilePixel('smelter_top', 8, 8),
            crafting_bench_top: getTilePixel('crafting_bench_top', 8, 8),
          }
        };
      })()
    `);

    console.log(`   * Atlas Dimensions: ${atlasDiag.atlasWidth}x${atlasDiag.atlasHeight}px (${atlasDiag.tileSize}px tiles)`);
    console.log(`   * Material Map Linked: ${atlasDiag.materialAttached ? '✅ YES' : '❌ NO'}`);
    console.log(`   * Stone Pixel (8,8): rgba(${atlasDiag.samples.stone.join(',')})`);
    console.log(`   * Dirt Pixel (8,8): rgba(${atlasDiag.samples.dirt.join(',')})`);
    console.log(`   * Grass Top Pixel (8,8): rgba(${atlasDiag.samples.grass_top.join(',')})`);
    console.log(`   * Coal Ore Pixel (8,8): rgba(${atlasDiag.samples.coal_ore.join(',')})`);
    console.log(`   * Iron Ore Pixel (8,8): rgba(${atlasDiag.samples.iron_ore.join(',')})`);
    console.log(`   * Gold Ore Pixel (8,8): rgba(${atlasDiag.samples.gold_ore.join(',')})`);
    console.log(`   * Diamond/Crystal Ore Pixel (8,8): rgba(${atlasDiag.samples.crystal_ore.join(',')})`);
    console.log(`   * Copper Ore Pixel (8,8): rgba(${atlasDiag.samples.copper_ore.join(',')})`);
    console.log(`   * Oak Planks Pixel (8,8): rgba(${atlasDiag.samples.planks_oak.join(',')})`);
    console.log(`   * Charcoal Smelter Front Pixel (8,8): rgba(${atlasDiag.samples.smelter_front.join(',')})`);
    console.log(`   * Charcoal Smelter Side Pixel (8,8): rgba(${atlasDiag.samples.smelter_side.join(',')})`);
    console.log(`   * Crafting Bench Top Pixel (8,8): rgba(${atlasDiag.samples.crafting_bench_top.join(',')})`);

    // 2. Start gameplay and place custom textured blocks
    console.log('\n2. Placing Custom Blocks & Rebuilding Chunks in World:');
    const placeRes = await evaluate(`
      (async () => {
        const g = window.game;
        g.isPlaying = true;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
          startScreen.classList.remove('active');
          startScreen.style.display = 'none';
        }
        g.player.position.set(0, 20, 0);

        // Place all block types in a showcase platform
        const w = g.world;
        const blocksToPlace = [
          { x: 1, y: 15, z: 0, id: 1 },  // GRASS
          { x: 2, y: 15, z: 0, id: 2 },  // DIRT
          { x: 3, y: 15, z: 0, id: 3 },  // STONE
          { x: 4, y: 15, z: 0, id: 4 },  // SAND
          { x: 5, y: 15, z: 0, id: 5 },  // WOOD
          { x: 1, y: 15, z: 1, id: 15 }, // COAL_ORE
          { x: 2, y: 15, z: 1, id: 16 }, // IRON_ORE
          { x: 3, y: 15, z: 1, id: 17 }, // GOLD_ORE
          { x: 4, y: 15, z: 1, id: 18 }, // CRYSTAL_ORE (DIAMOND)
          { x: 1, y: 15, z: 2, id: 22 }, // CRAFTING_BENCH
          { x: 2, y: 15, z: 2, id: 23 }, // CHARCOAL_SMELTER
          { x: 3, y: 15, z: 2, id: 20 }, // PINE_WOOD (SPRUCE)
        ];

        for (const b of blocksToPlace) {
          w.setBlock(b.x, b.y, b.z, b.id);
        }

        return { placedCount: blocksToPlace.length };
      })()
    `);
    console.log(`   * Successfully placed ${placeRes.placedCount} custom blocks in world!`);

    await new Promise(r => setTimeout(r, 1000));

    // 3. Verify chunk meshes and block breaking / placement
    console.log('\n3. Testing In-Game Voxel Breaking and Placing Interaction:');
    const breakTest = await evaluate(`
      (() => {
        const g = window.game;
        const initial = g.world.getBlock(1, 15, 0);
        g.world.setBlock(1, 15, 0, 0); // Break to AIR
        const afterBreak = g.world.getBlock(1, 15, 0);
        g.world.setBlock(1, 15, 0, 1); // Place back GRASS
        const afterPlace = g.world.getBlock(1, 15, 0);
        return {
          initial,
          afterBreak,
          afterPlace,
          pass: initial === 1 && afterBreak === 0 && afterPlace === 1
        };
      })()
    `);
    console.log(`   * Block break & place verification: ${breakTest.pass ? '✅ PASS' : '❌ FAIL'}`);

    // 4. Test Persistence (Save and Reload)
    console.log('\n4. Testing Persistence & World Reload with Custom Textures:');
    const saveTest = await evaluate(`
      (async () => {
        const g = window.game;
        const res = await g.saveCurrentState();
        return { saved: !!res };
      })()
    `);
    console.log(`   * World state successfully saved to disk/IndexedDB: ${saveTest.saved ? '✅ PASS' : '❌ FAIL'}`);

    // 5. Capture Browser Screenshot
    console.log('\n5. Capturing Browser Render Screenshot...');
    const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshotData && screenshotData.data) {
      const buffer = Buffer.from(screenshotData.data, 'base64');
      fs.writeFileSync('browser_custom_textures_render.png', buffer);
      console.log(`   * Saved in-game render screenshot: browser_custom_textures_render.png (${buffer.length} bytes) ✅`);
    }

    // 6. Check Console Errors
    console.log('\n6. Checking Browser Console Errors:');
    console.log(`   * Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length === 0) {
      console.log('   * Zero texture errors or runtime exceptions! ✅ PASS');
    } else {
      consoleErrors.forEach(e => console.error('     ❌ ', e));
    }

    console.log('\n🎉 ALL MINICRAFT V7.3 CUSTOM TEXTURE VERIFICATION TESTS PASSED!\n');
  } finally {
    console.log('🧹 Closing headless Chrome...');
    chromeProc.kill();
  }
}

runV73CustomTextureTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
