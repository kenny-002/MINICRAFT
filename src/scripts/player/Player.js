import * as THREE from 'three';
import { PlayerPhysics } from './PlayerPhysics.js';
import { CameraController } from './CameraController.js';
import { VoxelRaycaster } from '../utilities/VoxelRaycaster.js';
import { PlayerStats } from './PlayerStats.js';
import { BLOCK } from '../blocks/BlockTypes.js';
import { BreakCrackAtlas } from '../blocks/BreakCrackAtlas.js';
import { ITEMS, ITEM_CATEGORY, TOOL_TYPE, TOOL_TIER, ITEM_DEFINITIONS } from '../items/ItemTypes.js';
import { DropTable } from '../items/DropTable.js';

// Base hardness in seconds (with bare hand)
const BLOCK_HARDNESS = {
  [BLOCK.AIR]: 0,
  [BLOCK.WATER]: 0,
  [BLOCK.FLOWER_RED]: 0.15,
  [BLOCK.FLOWER_YELLOW]: 0.15,
  [BLOCK.GRASS_PLANT]: 0.15,
  [BLOCK.MUSHROOM]: 0.15,
  [BLOCK.LEAVES]: 0.25,
  [BLOCK.PINE_LEAVES]: 0.25,
  [BLOCK.SNOW]: 0.35,
  [BLOCK.DIRT]: 0.65,
  [BLOCK.GRASS]: 0.7,
  [BLOCK.SAND]: 0.6,
  [BLOCK.CACTUS]: 0.8,
  [BLOCK.WOOD]: 1.5,
  [BLOCK.PINE_WOOD]: 1.5,
  [BLOCK.CRAFTING_BENCH]: 1.2,
  [BLOCK.SANDSTONE]: 1.8,
  [BLOCK.ICE]: 1.6,
  [BLOCK.STONE]: 2.2,
  [BLOCK.COAL_ORE]: 2.6,
  [BLOCK.IRON_ORE]: 3.5,
  [BLOCK.GOLD_ORE]: 4.5,
  [BLOCK.CRYSTAL_ORE]: 5.5,
  [BLOCK.BEDROCK]: Infinity,
  [BLOCK.DEEPSLATE]: 3.5,
  [BLOCK.COPPER_ORE]: 3.0,
  [BLOCK.REDSTONE_ORE]: 3.5,
  [BLOCK.LAPIS_ORE]: 3.5,
  [BLOCK.EMERALD_ORE]: 4.0,
  [BLOCK.GRAVEL]: 0.6,
  [BLOCK.CLAY]: 0.6,
  [BLOCK.COBBLESTONE]: 2.0,
  [BLOCK.DEEPSLATE_COAL_ORE]: 3.5,
  [BLOCK.DEEPSLATE_IRON_ORE]: 4.5,
  [BLOCK.DEEPSLATE_GOLD_ORE]: 5.5,
  [BLOCK.DEEPSLATE_CRYSTAL_ORE]: 6.5,
  [BLOCK.DEEPSLATE_COPPER_ORE]: 4.0,
  [BLOCK.DEEPSLATE_REDSTONE_ORE]: 4.5,
  [BLOCK.DEEPSLATE_LAPIS_ORE]: 4.5,
  [BLOCK.DEEPSLATE_EMERALD_ORE]: 5.0,
  [BLOCK.GRANITE]: 2.2,
  [BLOCK.DIORITE]: 2.2,
  [BLOCK.ANDESITE]: 2.2,
  [BLOCK.TUFF]: 2.5,
};

/**
 * Player class combining physics, camera, input, mining progress, and survival stats.
 */
export class Player {
  constructor(world, camera, domElement, inventory, soundSystem) {
    this.world = world;
    this.camera = camera;
    this.domElement = domElement;
    this.inventory = inventory;
    this.sound = soundSystem;

    this.physics = new PlayerPhysics(world);
    this.cameraController = new CameraController(camera, domElement);
    this.stats = new PlayerStats(this);

    // Initial position
    this.position = new THREE.Vector3(0, 35, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      mine: false,
    };

    this.updateCount = 0;
    this.targetedVoxel = null; // Raycast result

    // Mining state
    this.isMining = false;
    this.miningTarget = null; // { x, y, z, blockId }
    this.miningProgress = 0.0; // 0.0 to 1.0
    this.miningTickTimer = 0.0;

    // Fall damage callback
    this.physics.onLandCallback = (landingVy) => {
      this.stats.applyFallDamage(landingVy);
      if (Math.abs(landingVy) > 10 && this.sound) {
        this.sound.playLandThud();
      }
    };

    // 3D Highlight Box for targeted block
    const boxGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const wireframeGeo = new THREE.WireframeGeometry(boxGeo);
    this.highlightMat = new THREE.LineBasicMaterial({
      color: 0x18181b,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    this.highlightMesh = new THREE.LineSegments(wireframeGeo, this.highlightMat);
    this.highlightMesh.visible = false;
    this.world.scene.add(this.highlightMesh);

    // 3D Progressive Pixel-Art Damage Crack Overlay Box (10 Stages)
    this.crackAtlas = new BreakCrackAtlas();
    const crackGeo = new THREE.BoxGeometry(1.003, 1.003, 1.003);
    this.crackMaterial = new THREE.MeshBasicMaterial({
      map: this.crackAtlas.getTexture(0),
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
      side: THREE.FrontSide,
    });
    this.crackMesh = new THREE.Mesh(crackGeo, this.crackMaterial);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 10;
    this.world.scene.add(this.crackMesh);

    this._bindKeys();
  }

  resetKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.sprint = false;
    this.keys.mine = false;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.resetMining();
  }

  _bindKeys() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const code = e.code;
      const k = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || code === 'ArrowUp' || k === 'w' || k === 'z') {
        this.keys.forward = true;
      }
      if (code === 'KeyS' || code === 'ArrowDown' || k === 's') {
        this.keys.backward = true;
      }
      if (code === 'KeyA' || code === 'ArrowLeft' || k === 'a' || k === 'q') {
        this.keys.left = true;
      }
      if (code === 'KeyD' || code === 'ArrowRight' || k === 'd') {
        this.keys.right = true;
      }
      if (code === 'Space' || k === ' ') {
        this.keys.jump = true;
        if (!e.target || (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
          e.preventDefault();
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || k === 'shift') {
        this.keys.sprint = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      const k = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || code === 'ArrowUp' || k === 'w' || k === 'z') {
        this.keys.forward = false;
      }
      if (code === 'KeyS' || code === 'ArrowDown' || k === 's') {
        this.keys.backward = false;
      }
      if (code === 'KeyA' || code === 'ArrowLeft' || k === 'a' || k === 'q') {
        this.keys.left = false;
      }
      if (code === 'KeyD' || code === 'ArrowRight' || k === 'd') {
        this.keys.right = false;
      }
      if (code === 'Space' || k === ' ') {
        this.keys.jump = false;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || k === 'shift') {
        this.keys.sprint = false;
      }
    });

    window.addEventListener('blur', () => {
      this.resetKeys();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.resetKeys();
        }
      });
    }

    window.addEventListener('mousedown', (e) => {
      if (!this.cameraController.isLocked) return;
      if (e.button === 0) {
        this.keys.mine = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keys.mine = false;
        this.resetMining();
      }
    });
  }

  getPressedKeys() {
    const pressed = [];
    if (this.keys.forward) pressed.push('W');
    if (this.keys.backward) pressed.push('S');
    if (this.keys.left) pressed.push('A');
    if (this.keys.right) pressed.push('D');
    if (this.keys.jump) pressed.push('Space');
    if (this.keys.sprint) pressed.push('Shift');
    if (this.keys.mine) pressed.push('Mine');
    return pressed.join('+') || 'None';
  }

  spawnAtSafePosition(gx = 0, gz = 0) {
    const surfaceY = this.world.terrainGenerator ? this.world.terrainGenerator.getHeight(gx, gz) : 78;
    const seaLvl = this.world.terrainGenerator ? this.world.terrainGenerator.seaLevel : 70;
    const safeY = Math.max(surfaceY, seaLvl) + 2.5;
    this.position.set(gx + 0.5, safeY, gz + 0.5);
    this.velocity.set(0, 0, 0);
  }

  respawn() {
    this.resetKeys();
    this.spawnAtSafePosition(0, 0);
    if (this.stats) {
      this.stats.health = this.stats.maxHealth;
      this.stats.hunger = this.stats.maxHunger;
      this.stats.isDead = false;
      this.stats.regenTimer = 0;
      this.stats.starveTimer = 0;
    }
  }

  resetMining() {
    this.isMining = false;
    this.miningTarget = null;
    this.miningProgress = 0.0;
    this.miningTickTimer = 0.0;
    if (this.crackMesh) {
      this.crackMesh.visible = false;
    }
    if (this.highlightMat) {
      this.highlightMat.color.setHex(0x18181b);
    }
  }

  stopMining() {
    this.keys.mine = false;
    this.resetMining();
  }

  startMining(hotbar) {
    if (this.game && this.game.ui && this.game.ui.isAnyModalOpen()) return;
    if (this.stats && this.stats.isDead) return;
    this.keys.mine = true;
    this.isMining = true;
  }

  getTargetBlock() {
    return this.targetedVoxel && this.targetedVoxel.hit ? this.targetedVoxel : null;
  }

  placeBlock(blockId) {
    if (this.stats && this.stats.isDead) return false;
    if (!this.targetedVoxel || !this.targetedVoxel.hit || !this.targetedVoxel.adjacent) return false;

    const px = this.targetedVoxel.adjacent.x;
    const py = this.targetedVoxel.adjacent.y;
    const pz = this.targetedVoxel.adjacent.z;

    // 1. World vertical height bounds (-70 to 89)
    if (py < -70 || py >= 90) return false;

    // 2. Destination voxel cannot be an already solid block
    const existing = this.world.getBlock(px, py, pz);
    if (existing !== BLOCK.AIR && existing !== BLOCK.WATER) return false;

    // 3. Prevent placement inside player's collision bounding box
    const pAABB = this.physics.getAABB(this.position);
    const bAABB = {
      minX: px,
      maxX: px + 1,
      minY: py,
      maxY: py + 1,
      minZ: pz,
      maxZ: pz + 1,
    };

    const overlapsPlayer =
      pAABB.minX < bAABB.maxX &&
      pAABB.maxX > bAABB.minX &&
      pAABB.minY < bAABB.maxY &&
      pAABB.maxY > bAABB.minY &&
      pAABB.minZ < bAABB.maxZ &&
      pAABB.maxZ > bAABB.minZ;

    if (overlapsPlayer) return false;

    // 4. Place block in world
    const success = this.world.setBlock(px, py, pz, blockId);
    if (success) {
      this.world._rebuildDirtyChunks(999);
      if (this.game && typeof this.game.markDirtyAndSave === 'function') {
        this.game.markDirtyAndSave();
      }
      return true;
    }

    return false;
  }

  update(delta, hotbar) {
    this.updateCount++;
    const isUIBlocked = !!(this.game && this.game.ui && this.game.ui.isAnyModalOpen());

    // 1. Movement vector (allow player movement only when no blocking UI modal is active)
    const forward = this.cameraController.getForwardVector();
    const right = this.cameraController.getRightVector();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (!isUIBlocked) {
      if (this.keys.forward) moveDir.add(forward);
      if (this.keys.backward) moveDir.sub(forward);
      if (this.keys.right) moveDir.add(right);
      if (this.keys.left) moveDir.sub(right);
    }

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
    }

    // 2. Jump / Swim handling (only when UI is not blocked)
    if (!isUIBlocked && this.keys.jump && !this.physics.isInWater) {
      this.physics.jump(this.velocity);
    }

    // 3. Physics update (always run physics so gravity & inertia resolve smoothly)
    this.physics.update(
      this.position,
      this.velocity,
      moveDir,
      !isUIBlocked && this.keys.sprint,
      !isUIBlocked && this.keys.jump,
      delta
    );

    // 4. Survival stats update (hunger & natural health regeneration)
    this.stats.update(delta, isMoving, this.keys.sprint, this.physics.isGrounded);

    // 5. Update camera
    this.cameraController.update(this.position, this.physics.eyeHeight);

    // 6. Raycast to target block
    const eyePos = new THREE.Vector3(this.position.x, this.position.y + this.physics.eyeHeight, this.position.z);
    const lookDir = this.cameraController.getLookDirection();
    this.targetedVoxel = VoxelRaycaster.raycast(this.world, eyePos, lookDir, 5.5);

    // Update highlight box
    if (this.targetedVoxel.hit && !isUIBlocked) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        this.targetedVoxel.x + 0.5,
        this.targetedVoxel.y + 0.5,
        this.targetedVoxel.z + 0.5
      );
    } else {
      this.highlightMesh.visible = false;
      this.resetMining();
    }

    // 7. Mining System execution
    if (!isUIBlocked && this.keys.mine && this.targetedVoxel.hit && this.cameraController.isLocked) {
      this._updateMining(delta, hotbar);
    } else {
      this.resetMining();
    }
  }

  _updateMining(delta, hotbar) {
    const { x, y, z, blockId } = this.targetedVoxel;
    if (blockId === BLOCK.AIR || blockId === BLOCK.WATER || blockId === BLOCK.BEDROCK) {
      this.resetMining();
      return;
    }

    const baseHardness = BLOCK_HARDNESS[blockId] !== undefined ? BLOCK_HARDNESS[blockId] : 2.0;
    if (baseHardness === Infinity || !isFinite(baseHardness)) {
      this.resetMining();
      return;
    }

    // Target change check
    if (!this.miningTarget || this.miningTarget.x !== x || this.miningTarget.y !== y || this.miningTarget.z !== z) {
      this.miningTarget = { x, y, z, blockId };
      this.miningProgress = 0.0;
      this.miningTickTimer = 0.0;
    }

    const equippedItem = hotbar ? hotbar.getSelectedItemDefinition() : null;

    // Calculate effective mining speed
    let speedMultiplier = 1.0;
    let toolTier = TOOL_TIER.HAND;

    if (equippedItem && equippedItem.category === ITEM_CATEGORY.TOOL) {
      toolTier = equippedItem.toolTier || TOOL_TIER.HAND;

      // Tool type matching bonus
      if (equippedItem.toolType === TOOL_TYPE.PICKAXE) {
        if (
          blockId === BLOCK.STONE ||
          blockId === BLOCK.COAL_ORE ||
          blockId === BLOCK.IRON_ORE ||
          blockId === BLOCK.GOLD_ORE ||
          blockId === BLOCK.CRYSTAL_ORE ||
          blockId === BLOCK.SANDSTONE ||
          blockId === BLOCK.ICE ||
          blockId === BLOCK.DEEPSLATE ||
          blockId === BLOCK.COPPER_ORE ||
          blockId === BLOCK.REDSTONE_ORE ||
          blockId === BLOCK.LAPIS_ORE ||
          blockId === BLOCK.EMERALD_ORE ||
          blockId === BLOCK.COBBLESTONE ||
          blockId === BLOCK.DEEPSLATE_COAL_ORE ||
          blockId === BLOCK.DEEPSLATE_IRON_ORE ||
          blockId === BLOCK.DEEPSLATE_GOLD_ORE ||
          blockId === BLOCK.DEEPSLATE_CRYSTAL_ORE ||
          blockId === BLOCK.DEEPSLATE_COPPER_ORE ||
          blockId === BLOCK.DEEPSLATE_REDSTONE_ORE ||
          blockId === BLOCK.DEEPSLATE_LAPIS_ORE ||
          blockId === BLOCK.DEEPSLATE_EMERALD_ORE ||
          blockId === BLOCK.GRANITE ||
          blockId === BLOCK.DIORITE ||
          blockId === BLOCK.ANDESITE ||
          blockId === BLOCK.TUFF
        ) {
          speedMultiplier = equippedItem.miningSpeed || 2.0;
        }
      } else if (equippedItem.toolType === TOOL_TYPE.AXE) {
        if (blockId === BLOCK.WOOD || blockId === BLOCK.PINE_WOOD || blockId === BLOCK.CRAFTING_BENCH) {
          speedMultiplier = equippedItem.miningSpeed || 2.0;
        }
      }
    }

    // Tool tier check penalty (mining advanced ores without proper tier is severely slowed)
    const requiredTier = DropTable.getRequiredTier(blockId);
    if (toolTier < requiredTier) {
      speedMultiplier *= 0.25;
    }

    const totalDuration = Math.max(0.08, baseHardness / speedMultiplier);
    this.miningProgress += delta / totalDuration;

    // Audio mining ticks
    this.miningTickTimer += delta;
    if (this.miningTickTimer >= 0.22) {
      if (this.sound) this.sound.playMiningTick(blockId);
      this.miningTickTimer = 0.0;
    }

    // Progressive Pixel-Art Damage Crack Overlay (10 Stages: 0 to 9)
    const stageIndex = Math.min(9, Math.floor(this.miningProgress * 10));
    if (this.crackMesh && this.crackMaterial) {
      this.crackMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.crackMaterial.map = this.crackAtlas.getTexture(stageIndex);
      this.crackMaterial.needsUpdate = true;
      this.crackMesh.visible = true;
    }

    // Block Broken Complete!
    if (this.miningProgress >= 1.0) {
      this._finishMining(x, y, z, blockId, toolTier, hotbar);
    }
  }

  _finishMining(x, y, z, blockId, toolTier, hotbar) {
    // 0. Reset mining progress immediately to prevent double-invocation
    this.resetMining();

    // Verify target coordinates and original block
    const existingBlock = this.world.getBlock(x, y, z);
    const targetBlockId = (existingBlock !== BLOCK.AIR && existingBlock !== undefined) ? existingBlock : blockId;
    if (targetBlockId === BLOCK.AIR) return;

    // 1. Remove block from world & rebuild chunks immediately
    this.world.setBlock(x, y, z, BLOCK.AIR);
    if (typeof this.world._rebuildDirtyChunks === 'function') {
      this.world._rebuildDirtyChunks(999);
    }

    // 2. Clean up station data & drop contents if broke chest / smelter / crop
    if (this.game) {
      if (this.game.storage && typeof this.game.storage.removeChest === 'function') {
        const chestItems = this.game.storage.removeChest(x, y, z);
        if (chestItems && chestItems.length > 0 && this.game.itemDrops) {
          for (const item of chestItems) {
            if (item && item.itemId && item.count > 0) {
              this.game.itemDrops.spawnDrop(item.itemId, item.count, x + 0.5, y + 0.4, z + 0.5, item.durability);
            }
          }
        }
      }
      if (this.game.smelting && typeof this.game.smelting.removeSmelter === 'function') {
        const smelterItems = this.game.smelting.removeSmelter(x, y, z);
        if (smelterItems && smelterItems.length > 0 && this.game.itemDrops) {
          for (const item of smelterItems) {
            if (item && item.itemId && item.count > 0) {
              this.game.itemDrops.spawnDrop(item.itemId, item.count, x + 0.5, y + 0.4, z + 0.5);
            }
          }
        }
      }
      if (this.game.farming && typeof this.game.farming.removeCrop === 'function') {
        this.game.farming.removeCrop(x, y, z);
      }
    }

    // 3. Play break sound
    if (this.sound) this.sound.playBlockBreak(targetBlockId);

    // 4. Resolve item drops from authoritative DropTable
    const drops = DropTable.getDrops(targetBlockId, toolTier);
    if (this.game && this.game.itemDrops) {
      for (const drop of drops) {
        if (drop && drop.itemId && drop.count > 0) {
          this.game.itemDrops.spawnDrop(drop.itemId, drop.count, x + 0.5, y + 0.4, z + 0.5);
        }
      }
    } else if (this.inventory) {
      for (const drop of drops) {
        if (drop && drop.itemId && drop.count > 0) {
          this.inventory.addItem(drop.itemId, drop.count);
        }
      }
    }

    // Development logging / diagnostics (Requirement 7)
    if (typeof window !== 'undefined' && window.__MINICRAFT_DEBUG__) {
      console.log(`[BLOCK_MINED] Block: ${targetBlockId} at (${x}, ${y}, ${z}) | ToolTier: ${toolTier} | Drops spawned:`, drops);
    }

    // 5. Unlock achievements
    if (this.game && this.game.ui && this.game.ui.achievements) {
      if (targetBlockId === BLOCK.WOOD || targetBlockId === BLOCK.PINE_WOOD) {
        this.game.ui.achievements.unlock('getting_wood');
      } else if (targetBlockId === BLOCK.STONE) {
        this.game.ui.achievements.unlock('stone_age');
      }
    }

    // 6. Reduce tool durability
    if (hotbar) {
      const broke = hotbar.damageActiveTool(1);
      if (broke && this.sound) {
        this.sound.playToolBreak();
      }
    }

    if (this.game && typeof this.game.markDirtyAndSave === 'function') {
      this.game.markDirtyAndSave();
    }
  }
}


