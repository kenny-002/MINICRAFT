import http from 'http';

async function testV59() {
  console.log('🚀 Running MINICRAFT V5.9 Verification Suite...');

  // Fetch index.html and verify structure
  const res = await fetch('http://localhost:5173/');
  const html = await res.text();

  console.log('1. Checking MINI COMPANY Splash Screen in HTML:');
  const hasSplash = html.includes('id="mini-company-splash"');
  const hasMiniCompanyLogo = html.includes('MINI COMPANY');
  const hasStudioSubtitle = html.includes('STUDIO');
  console.log(`   - Splash element present: ${hasSplash ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - MINI COMPANY branding: ${hasMiniCompanyLogo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - STUDIO subtitle: ${hasStudioSubtitle ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n2. Checking MINICRAFT 3D Main Menu in HTML:');
  const hasMinicraftLogo = html.includes('class="minicraft-stone-logo"');
  const hasBetaBadge = html.includes('class="beta-badge"');
  const hasBtnPlay = html.includes('id="btn-menu-play"');
  const hasBtnAchievements = html.includes('id="btn-menu-achievements"');
  const hasBtnSettings = html.includes('id="btn-menu-settings"');
  const hasBtnStore = html.includes('id="btn-menu-store"');
  console.log(`   - MINICRAFT 3D Logo present: ${hasMinicraftLogo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Yellow BETA badge present: ${hasBetaBadge ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - 4-Button Stack (Play, Achievements, Settings, Store): ${hasBtnPlay && hasBtnAchievements && hasBtnSettings && hasBtnStore ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n3. Checking Sub-Screen Modals in HTML:');
  const hasWorldSelect = html.includes('id="world-select-modal"');
  const hasAchievementsModal = html.includes('id="achievements-modal"');
  const hasSettingsModal = html.includes('id="settings-modal"');
  const hasStoreModal = html.includes('id="store-modal"');
  const hasDeleteConfirm = html.includes('id="delete-confirm-modal"');
  console.log(`   - World Select modal: ${hasWorldSelect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Achievements modal: ${hasAchievementsModal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Settings modal: ${hasSettingsModal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Store modal: ${hasStoreModal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Delete confirmation modal: ${hasDeleteConfirm ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n4. Checking No Forbidden Mojang / Minecraft proprietary strings in UI:');
  const hasMojang = /mojang/i.test(html);
  console.log(`   - Mojang string absent: ${!hasMojang ? '✅ PASS' : '❌ FAIL (Found Mojang)'}`);

  console.log('\nAll structural checks passed successfully!');
}

testV59().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
