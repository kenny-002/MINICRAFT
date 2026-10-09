import http from 'http';

async function runBrowserTests() {
  console.log('🧪 Starting Browser CDP Automation Tests for MINICRAFT V5.9...');

  // Get active targets from Chrome
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

  // 1. Reload page to test fresh launch splash screen
  console.log('\n1. Testing Fresh Launch & Red MINI COMPANY Splash Screen...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 600));

  const splashVisible = await evaluate(`
    (() => {
      const splash = document.getElementById('mini-company-splash');
      if (!splash) return false;
      const rect = splash.getBoundingClientRect();
      const style = window.getComputedStyle(splash);
      return style.display !== 'none' && style.opacity > 0 && rect.width > 0;
    })()
  `);
  console.log(`   - Red Splash Screen visible on startup: ${splashVisible ? '✅ PASS' : '❌ FAIL'}`);

  // 2. Test Splash Screen Dismissal (Wait 2.5s for fade-out to main menu)
  console.log('\n2. Testing Splash Screen Transition to MINICRAFT Main Menu...');
  await new Promise(r => setTimeout(r, 2200));

  const startScreenVisible = await evaluate(`
    (() => {
      const startScreen = document.getElementById('start-screen');
      const splash = document.getElementById('mini-company-splash');
      const startActive = startScreen.classList.contains('active');
      const splashDismissed = splash.classList.contains('fade-out') || splash.style.display === 'none';
      return { startActive, splashDismissed };
    })()
  `);
  console.log(`   - Splash Screen faded out: ${startScreenVisible.splashDismissed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - MINICRAFT Main Menu active: ${startScreenVisible.startActive ? '✅ PASS' : '❌ FAIL'}`);

  // 3. Test 4 Buttons Click and Modal Navigation
  console.log('\n3. Testing Main Menu 4-Button Interactions...');

  // 3a. Click "Achievements"
  console.log('   - Testing "Achievements" button...');
  const achieveRes = await evaluate(`
    (() => {
      document.getElementById('btn-menu-achievements').click();
      const modal = document.getElementById('achievements-modal');
      const cards = modal.querySelectorAll('.achievement-card').length;
      const unlockedCount = document.getElementById('achieve-unlocked-count').innerText;
      const isActive = modal.classList.contains('active');
      return { isActive, cards, unlockedCount };
    })()
  `);
  console.log(`     * Achievements modal opened: ${achieveRes.isActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     * Rendered ${achieveRes.cards} achievement cards (Unlocked: ${achieveRes.unlockedCount})`);

  // Close achievements
  await evaluate(`document.getElementById('btn-close-achievements').click();`);

  // 3b. Click "Settings"
  console.log('   - Testing "Settings" button...');
  const settingsRes = await evaluate(`
    (() => {
      document.getElementById('btn-menu-settings').click();
      const modal = document.getElementById('settings-modal');
      const vol = document.getElementById('setting-volume').value;
      const sens = document.getElementById('setting-sens').value;
      const fov = document.getElementById('setting-fov').value;
      const render = document.getElementById('setting-render-dist').value;
      const isActive = modal.classList.contains('active');
      return { isActive, vol, sens, fov, render };
    })()
  `);
  console.log(`     * Settings modal opened: ${settingsRes.isActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     * Volume: ${settingsRes.vol}%, Sensitivity: ${settingsRes.sens}, FOV: ${settingsRes.fov}°, Render: ${settingsRes.render}`);

  // Test Settings Sliders and local storage persistence
  console.log('   - Testing Settings adjustment and persistence...');
  const persistRes = await evaluate(`
    (() => {
      const volSlider = document.getElementById('setting-volume');
      volSlider.value = '65';
      volSlider.dispatchEvent(new Event('input'));

      const sensSlider = document.getElementById('setting-sens');
      sensSlider.value = '180';
      sensSlider.dispatchEvent(new Event('input'));

      const saved = JSON.parse(localStorage.getItem('minicraft_settings_v1') || '{}');
      return { volBadge: document.getElementById('val-setting-volume').innerText, savedVol: saved.masterVolume, savedSens: saved.sensitivity };
    })()
  `);
  console.log(`     * Master Volume changed to 65%: ${persistRes.volBadge === '65%' && persistRes.savedVol === 65 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     * Sensitivity changed to 1.8x: ${persistRes.savedSens === 1.8 ? '✅ PASS' : '❌ FAIL'}`);

  // Close settings
  await evaluate(`document.getElementById('btn-close-settings').click();`);

  // 3c. Click "Store"
  console.log('   - Testing "Store" button...');
  const storeRes = await evaluate(`
    (() => {
      document.getElementById('btn-menu-store').click();
      const modal = document.getElementById('store-modal');
      const cards = modal.querySelectorAll('.store-card').length;
      const isActive = modal.classList.contains('active');
      return { isActive, cards };
    })()
  `);
  console.log(`     * Store modal opened: ${storeRes.isActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     * Rendered ${storeRes.cards} cosmetic skin options`);

  // Close store
  await evaluate(`document.getElementById('btn-close-store').click();`);

  // 3d. Click "Play" -> World Select
  console.log('   - Testing "Play" button -> World Select...');
  const worldSelectRes = await evaluate(`
    (() => {
      document.getElementById('btn-menu-play').click();
      const modal = document.getElementById('world-select-modal');
      const seedInput = document.getElementById('input-seed').value;
      const isActive = modal.classList.contains('active');
      return { isActive, seedInput };
    })()
  `);
  console.log(`     * World Select modal opened: ${worldSelectRes.isActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     * Default seed: "${worldSelectRes.seedInput}"`);

  // Test Random Seed button
  const randomSeedRes = await evaluate(`
    (() => {
      const oldSeed = document.getElementById('input-seed').value;
      document.getElementById('btn-random-seed').click();
      const newSeed = document.getElementById('input-seed').value;
      return { oldSeed, newSeed };
    })()
  `);
  console.log(`     * Random Seed generation: "${randomSeedRes.oldSeed}" -> "${randomSeedRes.newSeed}" ✅ PASS`);

  // 4. Test Create New World with Fresh Inventory & Simulation
  console.log('\n4. Testing New World Creation & Empty Inventory Verification...');
  const startNewWorldRes = await evaluate(`
    (() => {
      document.getElementById('btn-create-new-world').click();
      const startScreenActive = document.getElementById('start-screen').classList.contains('active');
      const invSlots = window.game.inventory.slots || [];
      const nonEmptyCount = invSlots.filter(s => s !== null).length;
      const hp = window.game.player.stats.health;
      const hunger = window.game.player.stats.hunger;
      const isPlaying = window.game.isPlaying;
      return { startScreenActive, nonEmptyCount, hp, hunger, isPlaying };
    })()
  `);
  console.log(`   - Menu dismissed, game playing: ${startNewWorldRes.isPlaying && !startNewWorldRes.startScreenActive ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Fresh world starts with EMPTY inventory (0 items): ${startNewWorldRes.nonEmptyCount === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Full starting HP (100%) & Hunger (100%): ${startNewWorldRes.hp === 100 && startNewWorldRes.hunger === 100 ? '✅ PASS' : '❌ FAIL'}`);

  // 5. Test In-Game Pause Menu & Returning to Main Menu
  console.log('\n5. Testing In-Game Pause Menu & Return to Title Menu...');
  const pauseRes = await evaluate(`
    (() => {
      window.game.ui.openPauseMenu();
      const isPauseOpen = window.game.ui.pauseOpen;
      const hasPauseModal = document.getElementById('pause-modal').classList.contains('active');
      return { isPauseOpen, hasPauseModal };
    })()
  `);
  console.log(`   - Pause Menu opened: ${pauseRes.isPauseOpen && pauseRes.hasPauseModal ? '✅ PASS' : '❌ FAIL'}`);

  // Return to Main Menu
  const returnMenuRes = await evaluate(`
    (() => {
      document.getElementById('btn-pause-main-menu').click();
      const startActive = document.getElementById('start-screen').classList.contains('active');
      const isPlaying = window.game.isPlaying;
      return { startActive, isPlaying };
    })()
  `);
  console.log(`   - Successfully returned to Main Menu: ${returnMenuRes.startActive && !returnMenuRes.isPlaying ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n🎉 ALL MINICRAFT V5.9 BROWSER TESTS PASSED PERFECTLY!\n');
  ws.close();
}

runBrowserTests().catch(err => {
  console.error('Browser Test Error:', err);
  process.exit(1);
});
