async function main() {
  console.log('Connecting to Chrome CDP on http://127.0.0.1:9222/json...');
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.url.includes('5173')) || pages[0];

  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error('Could not find active browser target');
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
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
      console.error('Exception in evaluate:', res.exceptionDetails);
      throw new Error(res.exceptionDetails.text || 'Evaluation exception');
    }
    return res.result ? res.result.value : undefined;
  }

  console.log('=== TEST 1: New World Start & Empty Inventory ===');
  const test1 = await evaluate(`
    (() => {
      window.game.startNewWorld('SurvivalTest-Seed-1');
      const inv = window.game.inventory;
      const allSlots = inv.getAllItems().filter(s => s.item !== null);
      const isEquipmentEmpty = !inv.equipment.head && !inv.equipment.chest && !inv.equipment.legs && !inv.equipment.feet;
      return {
        totalItems: allSlots.length,
        isEquipmentEmpty,
        health: window.game.player.stats.health,
        hunger: window.game.player.stats.hunger,
        seed: window.game.world.seed
      };
    })()
  `);
  console.log('Test 1 Result:', test1);

  console.log('=== TEST 2: Resource Gathering (Wood & Stone Drops) ===');
  const test2 = await evaluate(`
    (() => {
      const p = window.game.player;
      const inv = window.game.inventory;
      
      // Spawn a wood block drop in front of player
      window.game.itemDrops.spawnDrop('block_wood', 4, p.position.x, p.position.y + 0.5, p.position.z - 0.5);
      
      // Update drops so player immediately vacuums the item
      window.game.itemDrops.update(1.0, p, inv, window.game.sound, window.game.ui);
      window.game.itemDrops.update(0.1, p, inv, window.game.sound, window.game.ui);
      
      const woodCount = inv.getItemCount('block_wood');
      return { woodCount, totalItems: inv.getAllItems().filter(s => s.item !== null).length };
    })()
  `);
  console.log('Test 2 Result:', test2);

  console.log('=== TEST 3 & 4: Mob Attack, Damage & Slain Loot Drop ===');
  const test3 = await evaluate(`
    (() => {
      const p = window.game.player;
      // Spawn a zombie in front of player
      const mob = window.game.entities.spawnMob('zombie', p.position.x, p.position.y, p.position.z - 2.0);
      const initialHp = mob.health;
      
      // Face the mob
      p.camera.position.copy(p.position).add({ x: 0, y: 1.6, z: 0 });
      p.camera.lookAt(mob.position.x, mob.position.y + 1.0, mob.position.z);
      
      // Perform melee attack
      const res = window.game.combat.performAttack(window.game.hotbar);
      const hpAfterHit = mob.health;
      
      // Lethal attack (mob.position is knocked up)
      const knockback = p.position.clone().sub(mob.position).normalize().multiplyScalar(-5);
      mob.takeDamage(100, knockback, p);
      
      // Check if mob drops were created
      const activeDrops = window.game.itemDrops.drops.length;
      return {
        initialHp,
        hitSuccess: res.hit,
        hpAfterHit,
        mobDead: mob.isDead,
        activeDrops
      };
    })()
  `);
  console.log('Test 3 & 4 Result:', test3);

  console.log('=== TEST 5, 6, 7: Player Damage, Death Screen & Death Drop Scatter ===');
  const test5 = await evaluate(`
    (() => {
      const p = window.game.player;
      const inv = window.game.inventory;
      
      // Give some items before dying
      inv.addItem('block_dirt', 32);
      inv.addItem('tool_wood_pickaxe', 1, 60);
      inv.setEquipment('chest', 'armor_iron_chestplate');
      
      const itemsBeforeDeath = inv.getAllItems().filter(s => s.item !== null).length;
      
      // Inflict lethal damage
      p.stats.takeDamage(200, 'melee', 'Vengeful Zombie');
      
      const isDeathModalActive = document.getElementById('death-modal').classList.contains('active');
      const deathCause = document.getElementById('death-cause-text').innerText;
      const itemsInInvAfterDeath = inv.getAllItems().filter(s => s.item !== null).length;
      const equipmentAfterDeath = inv.equipment.chest;
      const totalDropsInWorld = window.game.itemDrops.drops.length;
      
      return {
        itemsBeforeDeath,
        isDead: p.stats.isDead,
        isDeathModalActive,
        deathCause,
        itemsInInvAfterDeath,
        equipmentAfterDeath,
        totalDropsInWorld
      };
    })()
  `);
  console.log('Test 5, 6, 7 Result:', test5);

  console.log('=== TEST 8 & 9: Respawn & Return to Collect Dropped Loot ===');
  const test8 = await evaluate(`
    (() => {
      const p = window.game.player;
      const inv = window.game.inventory;
      const deathLocation = { x: p.position.x, y: p.position.y, z: p.position.z };
      
      // Click Respawn
      window.game.ui.btnRespawn.click();
      
      const isDeadAfterRespawn = p.stats.isDead;
      const healthAfterRespawn = p.stats.health;
      const hungerAfterRespawn = p.stats.hunger;
      const isDeathModalClosed = !document.getElementById('death-modal').classList.contains('active');
      const invOnRespawn = inv.getAllItems().filter(s => s.item !== null).length;
      
      // Move player back to death location and wait past pickup delay
      p.position.set(deathLocation.x, deathLocation.y, deathLocation.z);
      window.game.itemDrops.update(2.0, p, inv, window.game.sound, window.game.ui);
      
      const itemsRecovered = inv.getAllItems().filter(s => s.item !== null).length;
      const remainingDropsInWorld = window.game.itemDrops.drops.length;
      
      return {
        isDeadAfterRespawn,
        healthAfterRespawn,
        hungerAfterRespawn,
        isDeathModalClosed,
        invOnRespawn,
        itemsRecovered,
        remainingDropsInWorld
      };
    })()
  `);
  console.log('Test 8 & 9 Result:', test8);

  console.log('=== TEST 11: World Save & Reload Persistence ===');
  const test11 = await evaluate(`
    (() => {
      // Spawn an item in world before saving
      window.game.itemDrops.spawnDrop('block_stone', 45, 12, 11, 14);
      const dropsBeforeSave = window.game.itemDrops.drops.length;
      
      // Save game
      window.game.ui.btnSaveGame.click();
      
      // Load saved state into world
      const savedData = JSON.parse(localStorage.getItem('blockworld_save_v4'));
      const hasItemDropsInSave = Array.isArray(savedData.itemDrops) && savedData.itemDrops.length > 0;
      
      return {
        dropsBeforeSave,
        hasItemDropsInSave,
        savedItemDropCount: savedData.itemDrops.length,
        savedHealth: savedData.player.health
      };
    })()
  `);
  console.log('Test 11 Result:', test11);

  console.log('\nAll browser in-game checks complete!');
  ws.close();
}

main().catch(err => {
  console.error('Error in browser tests:', err);
  process.exit(1);
});
