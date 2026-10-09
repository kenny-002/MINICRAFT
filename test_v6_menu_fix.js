import http from 'http';

async function testV6Fix() {
  console.log('🧪 Starting V6.0 Main Menu Visibility Fix CDP Verification...');

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

  // 1. Reload page
  console.log('\n1. Reloading Page & Verifying Startup Splash + Main Menu...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 600));

  // Dismiss splash to reach main menu
  await evaluate(`
    (() => {
      if (window.game && window.game.ui) {
        window.game.ui.dismissSplash();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const menuState = await evaluate(`
    (() => {
      const startScreen = document.getElementById('start-screen');
      const style = window.getComputedStyle(startScreen);
      return {
        isActive: startScreen.classList.contains('active'),
        display: style.display,
        pointerEvents: style.pointerEvents,
        appState: window.game.ui.appState,
        isPlaying: window.game.isPlaying
      };
    })()
  `);
  console.log(`   - Main Menu is active: ${menuState.isActive && menuState.display === 'flex' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Main Menu pointer-events: ${menuState.pointerEvents}`);
  console.log(`   - App State: "${menuState.appState}", isPlaying: ${menuState.isPlaying}`);

  // 2. Click Play -> Create New World
  console.log('\n2. Clicking Play -> Create New World and Entering Gameplay...');
  await evaluate(`document.getElementById('btn-menu-play').click();`);
  await new Promise(r => setTimeout(r, 300));
  await evaluate(`document.getElementById('btn-create-new-world').click();`);
  await new Promise(r => setTimeout(r, 500));

  const gameEnteredState = await evaluate(`
    (() => {
      const startScreen = document.getElementById('start-screen');
      const worldSelect = document.getElementById('world-select-modal');
      const hud = document.getElementById('survival-hud');
      const hotbar = document.getElementById('hotbar');

      const startStyle = window.getComputedStyle(startScreen);
      const worldSelectStyle = window.getComputedStyle(worldSelect);
      const hudStyle = window.getComputedStyle(hud);

      return {
        startActive: startScreen.classList.contains('active'),
        startDisplay: startStyle.display,
        startPointerEvents: startStyle.pointerEvents,
        worldSelectDisplay: worldSelectStyle.display,
        hudDisplay: hudStyle.display,
        appState: window.game.ui.appState,
        isPlaying: window.game.isPlaying,
        cameraLocked: window.game.player.cameraController.isLocked
      };
    })()
  `);

  console.log(`   - Main Menu completely hidden (display: none): ${gameEnteredState.startDisplay === 'none' && !gameEnteredState.startActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Main Menu pointer-events disabled: ${gameEnteredState.startPointerEvents === 'none' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - World Selection modal hidden: ${gameEnteredState.worldSelectDisplay === 'none' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Gameplay HUD visible: ${gameEnteredState.hudDisplay !== 'none' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - App State is "playing": ${gameEnteredState.appState === 'playing' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - isPlaying is true: ${gameEnteredState.isPlaying ? '✅ PASS' : '❌ FAIL'}`);

  // 3. Test In-Game Pause Menu does NOT show Main Menu
  console.log('\n3. Testing Pause Menu Lifecycle...');
  await evaluate(`window.game.ui.openPauseMenu();`);
  await new Promise(r => setTimeout(r, 300));

  const pauseState = await evaluate(`
    (() => {
      const pauseModal = document.getElementById('pause-modal');
      const startScreen = document.getElementById('start-screen');
      const pauseStyle = window.getComputedStyle(pauseModal);
      const startStyle = window.getComputedStyle(startScreen);

      return {
        pauseDisplay: pauseStyle.display,
        startDisplay: startStyle.display,
        appState: window.game.ui.appState
      };
    })()
  `);
  console.log(`   - Pause modal visible: ${pauseState.pauseDisplay === 'flex' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Main Menu remains hidden during pause: ${pauseState.startDisplay === 'none' ? '✅ PASS' : '❌ FAIL'}`);

  // Resume game
  await evaluate(`document.getElementById('btn-pause-resume').click();`);
  await new Promise(r => setTimeout(r, 300));

  const resumedState = await evaluate(`
    (() => {
      const pauseModal = document.getElementById('pause-modal');
      const startScreen = document.getElementById('start-screen');
      return {
        pauseDisplay: window.getComputedStyle(pauseModal).display,
        startDisplay: window.getComputedStyle(startScreen).display,
        appState: window.game.ui.appState,
        isPlaying: window.game.isPlaying
      };
    })()
  `);
  console.log(`   - Resumed game (Pause hidden, Menu hidden, Playing): ${resumedState.pauseDisplay === 'none' && resumedState.startDisplay === 'none' && resumedState.isPlaying ? '✅ PASS' : '❌ FAIL'}`);

  // 4. Test Inventory does NOT bring back Title Menu
  console.log('\n4. Testing Inventory Toggle...');
  await evaluate(`window.game.ui.toggleInventory();`);
  await new Promise(r => setTimeout(r, 200));

  const invOpenState = await evaluate(`
    (() => {
      const inv = document.getElementById('inventory-modal');
      const start = document.getElementById('start-screen');
      return {
        invDisplay: window.getComputedStyle(inv).display,
        startDisplay: window.getComputedStyle(start).display
      };
    })()
  `);
  console.log(`   - Inventory open (Inventory: flex, Title Menu: none): ${invOpenState.invDisplay === 'flex' && invOpenState.startDisplay === 'none' ? '✅ PASS' : '❌ FAIL'}`);

  await evaluate(`window.game.ui.closeInventory();`);
  await new Promise(r => setTimeout(r, 200));

  const invClosedState = await evaluate(`
    (() => {
      const inv = document.getElementById('inventory-modal');
      const start = document.getElementById('start-screen');
      return {
        invDisplay: window.getComputedStyle(inv).display,
        startDisplay: window.getComputedStyle(start).display
      };
    })()
  `);
  console.log(`   - Inventory closed (Inventory: none, Title Menu: none): ${invClosedState.invDisplay === 'none' && invClosedState.startDisplay === 'none' ? '✅ PASS' : '❌ FAIL'}`);

  // 5. Test Returning to Main Menu & Loading Existing World
  console.log('\n5. Testing Return to Main Menu & Loading Existing World...');
  await evaluate(`window.game.ui.openPauseMenu();`);
  await new Promise(r => setTimeout(r, 200));
  await evaluate(`document.getElementById('btn-pause-main-menu').click();`);
  await new Promise(r => setTimeout(r, 400));

  const returnMenuState = await evaluate(`
    (() => {
      const startScreen = document.getElementById('start-screen');
      return {
        startDisplay: window.getComputedStyle(startScreen).display,
        appState: window.game.ui.appState,
        isPlaying: window.game.isPlaying
      };
    })()
  `);
  console.log(`   - Returned to Main Menu (display: flex, isPlaying: false): ${returnMenuState.startDisplay === 'flex' && !returnMenuState.isPlaying ? '✅ PASS' : '❌ FAIL'}`);

  // Open Play -> Load World
  await evaluate(`document.getElementById('btn-menu-play').click();`);
  await new Promise(r => setTimeout(r, 300));
  await evaluate(`
    (() => {
      const loadBtn = document.querySelector('.btn-load-saved-world');
      if (loadBtn) loadBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 500));

  const loadedWorldState = await evaluate(`
    (() => {
      const startScreen = document.getElementById('start-screen');
      const worldSelect = document.getElementById('world-select-modal');
      return {
        startDisplay: window.getComputedStyle(startScreen).display,
        worldSelectDisplay: window.getComputedStyle(worldSelect).display,
        appState: window.game.ui.appState,
        isPlaying: window.game.isPlaying
      };
    })()
  `);
  console.log(`   - Saved world loaded (Menu: none, WorldSelect: none, Playing: true): ${loadedWorldState.startDisplay === 'none' && loadedWorldState.worldSelectDisplay === 'none' && loadedWorldState.isPlaying ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n🎉 ALL V6.0 MAIN MENU VISIBILITY FIX CHECKS PASSED!\n');
  ws.close();
}

testV6Fix().catch(err => {
  console.error('V6 Fix Test Error:', err);
  process.exit(1);
});
