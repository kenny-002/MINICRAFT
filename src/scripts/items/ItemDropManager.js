import * as THREE from 'three';
import { ItemRegistry, ITEM_CATEGORY } from './ItemTypes.js';
import { BLOCK, BLOCK_PROPERTIES } from '../blocks/BlockTypes.js';
import { VoxelRaycaster } from '../utilities/VoxelRaycaster.js';

let NEXT_DROP_ID = 1;

/**
 * World Item Drop Manager for MINICRAFT Version 6.2.
 * Spawns, renders, animates, simulates true 3D voxel physics, and handles
 * magnetic player collection and partial inventory stack transfers.
 */
export class ItemDropManager {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.drops = []; // Array of DroppedItem objects

    // Configuration
    this.pickupRadius = 2.4;
    this.defaultPickupDelay = 0.4;
    this.magnetRadius = 2.4;
    this.magnetSpeed = 6.5;

    // Shared geometry for item drops
    this.dropGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);

    // Full inventory message throttle timestamp
    this._lastFullInvToast = 0;
  }

  /**
   * Helper to resolve distinct visual color for an item
   */
  getItemColor(itemId) {
    const itemDef = ItemRegistry.get(itemId);
    if (!itemDef) return 0x88aa88;

    // 1. Block item mapping from BLOCK_PROPERTIES
    if (itemDef.blockId !== undefined && BLOCK_PROPERTIES[itemDef.blockId]?.color) {
      return parseInt(BLOCK_PROPERTIES[itemDef.blockId].color.replace('#', '0x'), 16);
    }

    // 2. Explicit color on item definition
    if (itemDef.color) {
      return parseInt(itemDef.color.replace('#', '0x'), 16);
    }

    // 3. Category & Material Palette
    if (itemId.includes('crystal') || itemId.includes('shard')) return 0x00f0ff;
    if (itemId.includes('gold')) return 0xffcc00;
    if (itemId.includes('iron')) return 0xd8d8d8;
    if (itemId.includes('coal')) return 0x222222;
    if (itemId.includes('wood') || itemId.includes('plank') || itemId.includes('stick')) return 0x966038;
    if (itemId.includes('stone')) return 0x808080;
    if (itemId.includes('berry') || itemId.includes('meat')) return 0xe53935;
    if (itemId.includes('seed') || itemId.includes('wheat') || itemId.includes('grass')) return 0x7cb342;
    if (itemId.includes('cactus') || itemId.includes('leaves')) return 0x2e7d32;
    if (itemId.includes('torch')) return 0xff9800;

    return 0xa0a0a0;
  }

  /**
   * Spawns a single item drop into the 3D world with valid physics and mesh
   */
  spawnDrop(itemId, count = 1, x = 0, y = 0, z = 0, durability = null, options = {}) {
    if (!itemId || count <= 0) return null;

    const itemDef = ItemRegistry.get(itemId);
    const pickupDelay = options.pickupDelay !== undefined ? options.pickupDelay : this.defaultPickupDelay;

    // Create 3D Visual Mesh for the drop
    const meshColor = this.getItemColor(itemId);
    const mat = new THREE.MeshLambertMaterial({
      color: meshColor,
      transparent: false,
    });
    const mesh = new THREE.Mesh(this.dropGeo, mat);
    mesh.castShadow = true;
    mesh.position.set(x, y, z);

    if (this.scene) {
      this.scene.add(mesh);
    }

    const drop = {
      id: NEXT_DROP_ID++,
      itemId,
      count: Math.floor(count),
      durability: durability !== undefined ? durability : (itemDef?.durability || null),
      position: new THREE.Vector3(x, y, z),
      velocity: options.velocity || new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        2.2 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.6
      ),
      baseY: y,
      age: Math.random() * 10,
      pickupDelay,
      isGrounded: false,
      mesh,
      material: mat,
    };

    this.drops.push(drop);
    return drop;
  }

  /**
   * Drops ALL items carried in player inventory (backpack, hotbar, equipment)
   * around player's death position
   */
  spawnDeathDrops(inventory, deathPosition) {
    if (!inventory || !deathPosition) return [];

    const spawned = [];
    const px = deathPosition.x;
    const py = deathPosition.y + 0.4;
    const pz = deathPosition.z;

    // 1. Drop all main inventory / hotbar slots
    for (let i = 0; i < inventory.slotCount; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId && slot.count > 0) {
        const angle = Math.random() * Math.PI * 2;
        const rad = 0.3 + Math.random() * 0.5;
        const sx = px + Math.cos(angle) * rad;
        const sz = pz + Math.sin(angle) * rad;

        const drop = this.spawnDrop(slot.itemId, slot.count, sx, py, sz, slot.durability, {
          pickupDelay: 1.5,
          velocity: new THREE.Vector3(
            Math.cos(angle) * (0.8 + Math.random() * 0.6),
            2.6 + Math.random() * 1.0,
            Math.sin(angle) * (0.8 + Math.random() * 0.6)
          ),
        });
        if (drop) spawned.push(drop);
      }
    }

    // 2. Drop all equipped armor pieces
    if (inventory.equipment) {
      for (const [slotKey, eqItem] of Object.entries(inventory.equipment)) {
        if (eqItem && eqItem.itemId) {
          const angle = Math.random() * Math.PI * 2;
          const rad = 0.3 + Math.random() * 0.5;
          const sx = px + Math.cos(angle) * rad;
          const sz = pz + Math.sin(angle) * rad;
          const count = eqItem.count || 1;

          const drop = this.spawnDrop(eqItem.itemId, count, sx, py, sz, eqItem.durability, {
            pickupDelay: 1.5,
            velocity: new THREE.Vector3(
              Math.cos(angle) * (0.8 + Math.random() * 0.6),
              2.8 + Math.random() * 1.0,
              Math.sin(angle) * (0.8 + Math.random() * 0.6)
            ),
          });
          if (drop) spawned.push(drop);
        }
      }
    }

    return spawned;
  }

  /**
   * Helper to check if a block at (bx, by, bz) is solid
   */
  _isSolidVoxel(bx, by, bz) {
    if (!this.world || by < -70 || by >= 90) return false;
    const blockId = this.world.getBlock(bx, by, bz);
    if (blockId === BLOCK.AIR || blockId === BLOCK.WATER || blockId === undefined) return false;
    const props = BLOCK_PROPERTIES[blockId];
    return props ? props.solid : false;
  }

  /**
   * Main update tick for true voxel drop physics, animations, and player collection
   */
  update(delta, player, inventory, sound, ui) {
    if (!this.world) return;

    const playerPos = player ? player.position : null;
    const isPlayerAlive = player && player.stats ? !player.stats.isDead : true;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.age += delta;

      if (drop.pickupDelay > 0) {
        drop.pickupDelay -= delta;
      }

      const bx = Math.floor(drop.position.x);
      const bz = Math.floor(drop.position.z);

      // 1. True 3D Voxel Ground & Gravity Simulation
      if (!drop.isGrounded) {
        drop.velocity.y -= 18.0 * delta;
        drop.velocity.x *= Math.max(0, 1.0 - 4.0 * delta);
        drop.velocity.z *= Math.max(0, 1.0 - 4.0 * delta);

        drop.position.x += drop.velocity.x * delta;
        drop.position.z += drop.velocity.z * delta;

        const targetY = drop.position.y + drop.velocity.y * delta;
        const currentVoxelY = Math.floor(drop.position.y);
        const targetVoxelY = Math.max(0, Math.floor(targetY));

        let hitFloorY = null;

        // Scan downwards through voxels to find highest solid floor
        for (let cy = currentVoxelY; cy >= targetVoxelY; cy--) {
          if (this._isSolidVoxel(bx, cy, bz)) {
            hitFloorY = cy + 1.0 + 0.18;
            break;
          }
        }

        if (hitFloorY !== null && targetY <= hitFloorY) {
          drop.position.y = hitFloorY;
          drop.baseY = hitFloorY;
          drop.velocity.set(0, 0, 0);
          drop.isGrounded = true;
        } else {
          drop.position.y = targetY;
          drop.baseY = targetY;
          if (drop.position.y <= 0.2) {
            drop.position.y = 0.2;
            drop.baseY = 0.2;
            drop.velocity.set(0, 0, 0);
            drop.isGrounded = true;
          }
        }
      } else {
        // When grounded, verify supporting block beneath is still solid
        const supportBlockY = Math.floor(drop.baseY - 0.25);
        if (!this._isSolidVoxel(bx, supportBlockY, bz)) {
          // Block beneath was mined; drop falls down
          drop.isGrounded = false;
        }
      }

      // 2. Visual Bobbing & Rotation
      if (drop.mesh) {
        const bob = drop.isGrounded ? Math.sin(drop.age * 3.5) * 0.06 : 0;
        drop.mesh.position.set(drop.position.x, drop.baseY + bob, drop.position.z);
        drop.mesh.rotation.y += delta * 2.2;
      }

      // 3. Player Magnetic Attraction & Pickup Detection
      if (playerPos && isPlayerAlive && drop.pickupDelay <= 0) {
        const dist = Math.hypot(
          drop.position.x - playerPos.x,
          drop.position.y - (playerPos.y + 0.5),
          drop.position.z - playerPos.z
        );

        if (dist <= this.pickupRadius) {
          // Line of sight check (prevent pickup through thick solid walls when not touching)
          let isObstructed = false;
          if (dist > 1.2) {
            const origin = new THREE.Vector3(playerPos.x, playerPos.y + 1.0, playerPos.z);
            const toDrop = new THREE.Vector3().subVectors(drop.position, origin);
            const rayDist = toDrop.length();
            const dir = toDrop.clone().normalize();
            const blockHit = VoxelRaycaster.raycast(this.world, origin, dir, rayDist);
            isObstructed = !!(blockHit && blockHit.hit && blockHit.distance < rayDist - 0.5);
          }

          if (!isObstructed) {
            // Magnetic pull toward player
            const pullTarget = new THREE.Vector3(playerPos.x, playerPos.y + 0.6, playerPos.z);
            drop.position.lerp(pullTarget, Math.min(1.0, this.magnetSpeed * delta));
            drop.baseY = drop.position.y;

            // Collection range (close to player body)
            if (dist <= 1.3 && inventory) {
              const added = inventory.addItem(drop.itemId, drop.count, drop.durability);
              if (added > 0) {
                drop.count -= added;

                // Audio & UI Feedback
                if (sound && typeof sound.playItemPickup === 'function') {
                  sound.playItemPickup();
                }
                if (ui && typeof ui.showToast === 'function') {
                  const def = ItemRegistry.get(drop.itemId);
                  ui.showToast(`+${added} ${def ? def.name : drop.itemId}`);
                }

                // If entire stack collected, remove drop
                if (drop.count <= 0) {
                  this._removeDropMesh(drop);
                  this.drops.splice(i, 1);
                  continue;
                }
              } else {
                // Inventory is completely full
                const now = Date.now();
                if (now - this._lastFullInvToast > 2500) {
                  this._lastFullInvToast = now;
                  if (ui && typeof ui.showToast === 'function') {
                    ui.showToast('Inventory full!', 2000);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  _removeDropMesh(drop) {
    if (drop.mesh && this.scene) {
      this.scene.remove(drop.mesh);
    }
    if (drop.material) {
      drop.material.dispose();
    }
  }

  clear() {
    for (const drop of this.drops) {
      this._removeDropMesh(drop);
    }
    this.drops = [];
  }

  saveState() {
    return this.drops.map((d) => ({
      itemId: d.itemId,
      count: d.count,
      durability: d.durability,
      x: Number(d.position.x.toFixed(2)),
      y: Number(d.position.y.toFixed(2)),
      z: Number(d.position.z.toFixed(2)),
    }));
  }

  loadState(savedDrops) {
    this.clear();
    if (!Array.isArray(savedDrops)) return;

    for (const d of savedDrops) {
      if (d.itemId && d.count > 0 && typeof d.x === 'number' && typeof d.y === 'number' && typeof d.z === 'number') {
        this.spawnDrop(d.itemId, d.count, d.x, d.y, d.z, d.durability, { pickupDelay: 0.4 });
      }
    }
  }

  dispose() {
    this.clear();
    if (this.dropGeo) {
      this.dropGeo.dispose();
    }
  }
}
