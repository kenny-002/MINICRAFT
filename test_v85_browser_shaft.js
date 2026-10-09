import { spawn } from 'child_process';
import fs from 'fs';

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

export async function testV85BrowserShaft() {
  console.log('Connecting to browser CDP on port 9222...');
  const res = await fetch('http://localhost:9222/json');
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('localhost:5173'));
  if (!pageTarget) {
    throw new Error('Could not find MINICRAFT page target on port 9222');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  ws.addEventListener('message', event => {
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
      const id = msgId++;
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
    if (res && res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails);
    }
    return res && res.result ? res.result.value : null;
  }

  console.log('1. Reloading game page...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  console.log('2. Creating / entering fresh world for V8.5 shaft verification...');
  const initResult = await evaluate(`
    (async () => {
      // Create new world
      if (window.game && window.game.saveSystem) {
        const world = await window.game.saveSystem.createNewWorld('V8.5 Layer Test World', 'SEED-LAYERS-9');
        await window.game.loadWorld(world.id);
        return { success: true, worldId: world.id, seed: world.seed };
      } else {
        const playBtn = document.getElementById('play-btn');
        if (playBtn) playBtn.click();
        return { success: true, fallback: true };
      }
    })()
  `);
  console.log('World initialized:', initResult);
  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Inspecting live world chunk and layer blocks at vertical shaft...');
  const liveShaftData = await evaluate(`
    (() => {
      const world = window.game.world;
      const player = window.game.player;
      
      // Toggle F3 debug overlay on
      if (window.game.uiManager && !window.game.uiManager.showDebug) {
        window.game.uiManager.showDebug = true;
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugOverlay) debugOverlay.classList.remove('hidden');
      }

      // Collect shaft from Y = 80 down to Y = -70 at (0, 0)
      const shaft = [];
      for (let y = 80; y >= -70; y--) {
        const b = world.getBlock(0, y, 0);
        shaft.push({ y, b });
      }

      // Excavate a clear shaft around (0, 0) from Y=80 down to -69 so all layers are clearly visible
      for (let y = 80; y >= -69; y--) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) {
              world.setBlock(dx, y, dz, 0);
            }
          }
        }
        // Place torches along wall
        if (y % 8 === 0 && y >= -65) {
          world.setBlock(1, y, 0, 29);
        }
      }

      // Ensure bedrock at Y = -70
      world.setBlock(0, -70, 0, 30);

      // Position player at Y = 80 looking down the shaft
      player.position.set(0, 81.5, 0.5);
      player.velocity.set(0, 0, 0);
      player.isGrounded = false;
      if (player.cameraController) {
        player.cameraController.pitch = -1.2;
        player.cameraController.yaw = 0;
      }

      if (window.game.uiManager) {
        window.game.uiManager.update(0.016);
      }

      const f3Text = document.getElementById('debug-overlay') ? document.getElementById('debug-overlay').innerText : '';

      return {
        shaftSamples: shaft.filter(s => s.y % 10 === 0 || s.y === -70 || s.y === 80),
        f3Text,
        playerPos: { x: player.position.x, y: player.position.y, z: player.position.z }
      };
    })()
  `);

  console.log('Live shaft samples:', liveShaftData.shaftSamples);
  console.log('F3 Overlay Telemetry:\n', liveShaftData.f3Text);

  // Render frames to let chunks and camera update
  for (let i = 0; i < 15; i++) {
    await evaluate(`
      (() => {
        if (window.game && window.game.renderer && window.game.scene && window.game.camera) {
          window.game.camera.position.set(0, 81.5, 0.5);
          window.game.camera.rotation.x = -1.2;
          window.game.renderer.render(window.game.scene, window.game.camera);
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('4. Capturing in-game screenshot of vertical shaft...');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const data = shot.data || (shot.result && shot.result.data);
  const artifactPath = '/Users/dineshs/.gemini/antigravity-ide/brain/2723bf93-4ba1-40f3-9833-9fa487e287cc/v85_vertical_shaft_view.png';
  if (data) {
    fs.writeFileSync(artifactPath, Buffer.from(data, 'base64'));
    console.log(`✅ Screenshot saved to ${artifactPath}`);
  } else {
    console.error('Screenshot data empty:', shot);
  }

  ws.close();
  return { success: true, artifactPath };
}

if (process.argv[1] && process.argv[1].endsWith('test_v85_browser_shaft.js')) {
  testV85BrowserShaft().catch(console.error);
}
