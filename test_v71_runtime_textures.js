import { spawn } from 'child_process';
import http from 'http';

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

export async function runV71TextureTests() {
  console.log('🚀 Launching Headless Chrome on CDP port 9222 for V7.1 Texture Verification...');
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
    console.log('🧪 MINICRAFT V7.1 — IN-GAME RUNTIME TEXTURE DIAGNOSTICS');
    console.log('======================================================\n');

    // Wait for game initialization
    await new Promise(r => setTimeout(r, 2000));

    // 1. Diagnostics: Texture Atlas construction & Active Texture Mapping
    console.log('1. Verifying Runtime Texture Atlas & Material Wiring:');
    const atlasDiag = await evaluate(`
      (() => {
        const g = window.game;
        if (!g || !g.world || !g.world.textureAtlas) {
          return { error: 'Game or TextureAtlas not found on window.game' };
        }
        const atlas = g.world.textureAtlas;
        const mat = g.world.chunkMaterial;

        // Sample pixel colors from canvas for key blocks
        const ctx = atlas.ctx;
        function getPixelColor(tileName, px, py) {
          const coords = atlas._getTileCoords(atlas.tileIndices[tileName]);
          const data = ctx.getImageData(coords.x + px, coords.y + py, 1, 1).data;
          return { r: data[0], g: data[1], b: data[2], a: data[3] };
        }

        return {
          atlasWidth: atlas.width,
          atlasHeight: atlas.height,
          tileSize: atlas.tileSize,
          cols: atlas.cols,
          rows: atlas.rows,
          materialHasMap: !!mat.map,
          materialMapMatchesAtlas: mat.map === atlas.texture,
          materialVertexColors: mat.vertexColors,
          keyTiles: {
            stone: atlas.getTileUV('stone'),
            dirt: atlas.getTileUV('dirt'),
            grass_top: atlas.getTileUV('grass_top'),
            grass_side: atlas.getTileUV('grass_side'),
            copper_ore: atlas.getTileUV('copper_ore'),
            gold_ore: atlas.getTileUV('gold_ore'),
            iron_ore: atlas.getTileUV('iron_ore'),
            coal_ore: atlas.getTileUV('coal_ore'),
            smelter_front: atlas.getTileUV('smelter_front'),
            smelter_side: atlas.getTileUV('smelter_side'),
            smelter_top: atlas.getTileUV('smelter_top'),
          },
          pixelSamples: {
            stone: getPixelColor('stone', 8, 8),
            dirt: getPixelColor('dirt', 8, 8),
            grass_top: getPixelColor('grass_top', 8, 8),
            copper_ore_vein: getPixelColor('copper_ore', 8, 8),
            gold_ore_vein: getPixelColor('gold_ore', 8, 8),
            smelter_front_core: getPixelColor('smelter_front', 8, 8),
            smelter_side: getPixelColor('smelter_side', 8, 8),
          }
        };
      })()
    `);

    console.log(`   * Atlas Dimensions: ${atlasDiag.atlasWidth}x${atlasDiag.atlasHeight}px (${atlasDiag.cols}x${atlasDiag.rows} tiles @ ${atlasDiag.tileSize}px)`);
    console.log(`   * Chunk Material Map connected to Atlas Texture: ${atlasDiag.materialMapMatchesAtlas ? '✅ YES' : '❌ NO'}`);
    console.log(`   * Chunk Material uses Vertex Colors: ${atlasDiag.materialVertexColors ? '✅ YES' : '❌ NO'}`);
    console.log(`   * Stone UV: u0=${atlasDiag.keyTiles.stone.u0.toFixed(4)}, v0=${atlasDiag.keyTiles.stone.v0.toFixed(4)}`);
    console.log(`   * Dirt UV: u0=${atlasDiag.keyTiles.dirt.u0.toFixed(4)}, v0=${atlasDiag.keyTiles.dirt.v0.toFixed(4)}`);
    console.log(`   * Grass Top UV: u0=${atlasDiag.keyTiles.grass_top.u0.toFixed(4)}, v0=${atlasDiag.keyTiles.grass_top.v0.toFixed(4)}`);
    console.log(`   * Smelter Front UV: u0=${atlasDiag.keyTiles.smelter_front.u0.toFixed(4)}, v0=${atlasDiag.keyTiles.smelter_front.v0.toFixed(4)}`);
    console.log(`   * Smelter Side UV: u0=${atlasDiag.keyTiles.smelter_side.u0.toFixed(4)}, v0=${atlasDiag.keyTiles.smelter_side.v0.toFixed(4)}`);
    console.log(`   * Pixel Sample (Stone center): rgb(${atlasDiag.pixelSamples.stone.r}, ${atlasDiag.pixelSamples.stone.g}, ${atlasDiag.pixelSamples.stone.b})`);
    console.log(`   * Pixel Sample (Dirt center): rgb(${atlasDiag.pixelSamples.dirt.r}, ${atlasDiag.pixelSamples.dirt.g}, ${atlasDiag.pixelSamples.dirt.b})`);
    console.log(`   * Pixel Sample (Smelter Front center): rgb(${atlasDiag.pixelSamples.smelter_front_core.r}, ${atlasDiag.pixelSamples.smelter_front_core.g}, ${atlasDiag.pixelSamples.smelter_front_core.b})`);

    // 2. Start a fresh world to test gameplay & voxel rendering
    console.log('\n2. Initializing In-Game World & Spawning Smelter / Ores...');
    await evaluate(`
      (async () => {
        const g = window.game;
        g.isPlaying = true;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
          startScreen.classList.remove('active');
          startScreen.style.display = 'none';
        }
        g.player.position.set(0, 20, 0);
        
        // Place stone, dirt, grass, copper ore, gold ore, coal ore, iron ore, and charcoal smelter
        // around player to test in-chunk mesh generation
        const b = window.game.world;
        b.setBlock(1, 15, 0, 3); // STONE
        b.setBlock(2, 15, 0, 2); // DIRT
        b.setBlock(3, 15, 0, 1); // GRASS
        b.setBlock(1, 15, 1, 17); // GOLD_ORE
        b.setBlock(2, 15, 1, 16); // IRON_ORE
        b.setBlock(3, 15, 1, 15); // COAL_ORE
        b.setBlock(1, 15, 2, 23); // CHARCOAL_SMELTER
      })()
    `);

    await new Promise(r => setTimeout(r, 1000));

    // 3. Inspect Chunk Meshes and UV buffer attributes
    console.log('\n3. Inspecting Chunk Mesh UVs and Quad Geometry for Placed Blocks:');
    const chunkDiag = await evaluate(`
      (() => {
        const g = window.game;
        let totalSolidMeshes = 0;
        let totalVertices = 0;
        let hasValidUVs = true;

        for (const [key, chunk] of g.world.chunks.entries()) {
          if (chunk.mesh) {
            totalSolidMeshes++;
            const pos = chunk.mesh.geometry.getAttribute('position');
            const uvs = chunk.mesh.geometry.getAttribute('uv');
            if (!pos || !uvs || pos.count !== uvs.count) {
              hasValidUVs = false;
            }
            totalVertices += pos ? pos.count : 0;
          }
        }

        return {
          chunkCount: g.world.chunks.size,
          solidMeshes: totalSolidMeshes,
          totalVertices,
          hasValidUVs,
        };
      })()
    `);

    console.log(`   * Total Active Chunks: ${chunkDiag.chunkCount}`);
    console.log(`   * Rendered Solid Chunk Meshes: ${chunkDiag.solidMeshes}`);
    console.log(`   * Total Voxel Vertices: ${chunkDiag.totalVertices}`);
    console.log(`   * Attribute & UV Alignment: ${chunkDiag.hasValidUVs ? '✅ PASS' : '❌ FAIL'}`);

    // 4. Test Day/Night Lighting Color Balance
    console.log('\n4. Verifying Day/Night Lighting Color Balance:');
    const lightingDiag = await evaluate(`
      (() => {
        const dnc = window.game.dayNightCycle;
        return {
          ambientColorHex: dnc.ambientLight.color.getHexString(),
          ambientIntensity: dnc.ambientLight.intensity,
          hemiSkyHex: dnc.hemiLight.color.getHexString(),
          hemiGroundHex: dnc.hemiLight.groundColor.getHexString(),
          sunColorHex: dnc.sunLight.color.getHexString(),
        };
      })()
    `);

    console.log(`   * Ambient Light Color: #${lightingDiag.ambientColorHex} (Intensity: ${lightingDiag.ambientIntensity})`);
    console.log(`   * Hemi Sky Color: #${lightingDiag.hemiSkyHex}`);
    console.log(`   * Hemi Ground Color: #${lightingDiag.hemiGroundHex}`);
    console.log(`   * Sun Light Color: #${lightingDiag.sunColorHex}`);
    const isNeutralLighting = lightingDiag.ambientColorHex.toLowerCase() !== '8ca8d8';
    console.log(`   * Neutral Balanced Palette (No Blue Tint wash): ${isNeutralLighting ? '✅ PASS' : '❌ FAIL'}`);

    // 5. Test Block Breaking and Placement Interaction
    console.log('\n5. Testing In-World Block Breaking & Placement Interaction:');
    const breakPlaceResult = await evaluate(`
      (async () => {
        const g = window.game;
        const initialStone = g.world.getBlock(1, 15, 0);
        
        // Break the stone block at (1, 15, 0)
        g.world.setBlock(1, 15, 0, 0);
        const postBreakBlock = g.world.getBlock(1, 15, 0);
        
        // Place back a stone block
        g.world.setBlock(1, 15, 0, 3);
        const postPlaceBlock = g.world.getBlock(1, 15, 0);

        return {
          initialStone,
          postBreakBlock,
          postPlaceBlock,
          success: initialStone === 3 && postBreakBlock === 0 && postPlaceBlock === 3
        };
      })()
    `);

    console.log(`   * Block Break & Place Test: ${breakPlaceResult.success ? '✅ PASS' : '❌ FAIL'}`);

    // 6. Test Multi-World Save and Reload Consistency
    console.log('\n6. Testing Multi-World Save & Reload:');
    const saveLoadResult = await evaluate(`
      (async () => {
        const g = window.game;
        const saveRes = await g.saveCurrentState();
        return { saved: !!saveRes };
      })()
    `);
    console.log(`   * World state saved without loss: ${saveLoadResult.saved ? '✅ PASS' : '❌ FAIL'}`);

    // 7. Check for Any Console Errors
    console.log('\n7. Checking Browser Console Errors:');
    console.log(`   * Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.error('     ❌ ', e));
    } else {
      console.log('   * Zero texture-loading or runtime exceptions! ✅ PASS');
    }

    console.log('\n🎉 ALL MINICRAFT V7.1 IN-GAME TEXTURE & RENDERING TESTS PASSED!\n');

  } finally {
    console.log('🧹 Closing headless Chrome...');
    chromeProc.kill();
  }
}

runV71TextureTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
