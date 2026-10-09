import { ITEMS, TOOL_TIER } from '../items/ItemTypes.js';
import { BLOCK } from '../blocks/BlockTypes.js';

/**
 * Procedural Pixel-Art Icon Generator for BlockWorld.
 * Generates original 32x32 crisp pixel sprites for all items, blocks, tools,
 * weapons, armor sets, foods, seeds, and UI silhouettes.
 * Zero external copyrighted assets.
 */
export class PixelIconGenerator {
  constructor(textureAtlas) {
    this.textureAtlas = textureAtlas;
    this.cache = new Map();
  }

  /**
   * Get an icon data URL for an item ID
   */
  getIconUrl(itemId) {
    if (!itemId) return '';
    if (this.cache.has(itemId)) {
      return this.cache.get(itemId);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    this.drawIcon(ctx, itemId, 0, 0, 32);

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(itemId, dataUrl);
    return dataUrl;
  }

  /**
   * Draw an item icon onto a 2D canvas context at given position & size
   */
  drawIcon(ctx, itemId, x = 0, y = 0, size = 32) {
    const s = size;
    const scale = size / 16;
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    // Helper to draw scaled pixel rect
    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(pxX * scale), Math.floor(pxY * scale), Math.ceil(pxW * scale), Math.ceil(pxH * scale));
    };

    // Helper to render isometric 3D mini-block
    const drawMiniBlock = (topTile, sideTile, frontTile = null) => {
      if (!this.textureAtlas || !this.textureAtlas.canvas) {
        px('#555', 2, 2, 12, 12);
        return;
      }
      const atlas = this.textureAtlas.canvas;
      const tCoords = this.textureAtlas._getTileCoords(
        typeof topTile === 'string' ? this.textureAtlas.tileIndices[topTile] : topTile
      );
      const sCoords = this.textureAtlas._getTileCoords(
        typeof sideTile === 'string' ? this.textureAtlas.tileIndices[sideTile] : sideTile
      );
      const fCoords = frontTile
        ? this.textureAtlas._getTileCoords(
            typeof frontTile === 'string' ? this.textureAtlas.tileIndices[frontTile] : frontTile
          )
        : sCoords;

      // Draw isometric stylized cube icon (16x16 viewport)
      // Top face
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(8 * scale, 1 * scale);
      ctx.lineTo(15 * scale, 5 * scale);
      ctx.lineTo(8 * scale, 9 * scale);
      ctx.lineTo(1 * scale, 5 * scale);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(atlas, tCoords.x, tCoords.y, 16, 16, 0, 0, 16 * scale, 10 * scale);
      ctx.restore();

      // Left face
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(1 * scale, 5 * scale);
      ctx.lineTo(8 * scale, 9 * scale);
      ctx.lineTo(8 * scale, 15 * scale);
      ctx.lineTo(1 * scale, 11 * scale);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(atlas, sCoords.x, sCoords.y, 16, 16, 0, 4 * scale, 8 * scale, 12 * scale);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, 16 * scale, 16 * scale);
      ctx.restore();

      // Right face
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(8 * scale, 9 * scale);
      ctx.lineTo(15 * scale, 5 * scale);
      ctx.lineTo(15 * scale, 11 * scale);
      ctx.lineTo(8 * scale, 15 * scale);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(atlas, fCoords.x, fCoords.y, 16, 16, 8 * scale, 4 * scale, 8 * scale, 12 * scale);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, 16 * scale, 16 * scale);
      ctx.restore();

      // Black voxel pixel outline
      ctx.strokeStyle = '#1a1a20';
      ctx.lineWidth = Math.max(1, Math.floor(scale * 0.7));
      ctx.beginPath();
      ctx.moveTo(8 * scale, 1 * scale);
      ctx.lineTo(15 * scale, 5 * scale);
      ctx.lineTo(15 * scale, 11 * scale);
      ctx.lineTo(8 * scale, 15 * scale);
      ctx.lineTo(1 * scale, 11 * scale);
      ctx.lineTo(1 * scale, 5 * scale);
      ctx.closePath();
      ctx.moveTo(8 * scale, 9 * scale);
      ctx.lineTo(8 * scale, 15 * scale);
      ctx.moveTo(8 * scale, 9 * scale);
      ctx.lineTo(1 * scale, 5 * scale);
      ctx.moveTo(8 * scale, 9 * scale);
      ctx.lineTo(15 * scale, 5 * scale);
      ctx.stroke();
    };

    // Switch on item ID
    switch (itemId) {
      // --- BLOCK ITEMS (Isometric Voxel Cubes) ---
      case ITEMS.GRASS:
        drawMiniBlock('grass_top', 'grass_side');
        break;
      case ITEMS.DIRT:
        drawMiniBlock('dirt', 'dirt');
        break;
      case ITEMS.STONE:
        drawMiniBlock('stone', 'stone');
        break;
      case ITEMS.SAND:
        drawMiniBlock('sand', 'sand');
        break;
      case ITEMS.WOOD:
        drawMiniBlock('wood_top', 'wood_side');
        break;
      case ITEMS.LEAVES:
        drawMiniBlock('leaves', 'leaves');
        break;
      case ITEMS.SNOW:
        drawMiniBlock('snow_top', 'snow_side');
        break;
      case ITEMS.SANDSTONE:
        drawMiniBlock('sandstone_top', 'sandstone_side');
        break;
      case ITEMS.ICE:
        drawMiniBlock('ice', 'ice');
        break;
      case ITEMS.CACTUS:
        drawMiniBlock('cactus_top', 'cactus_side');
        break;
      case ITEMS.PINE_WOOD:
        drawMiniBlock('pine_wood_top', 'pine_wood_side');
        break;
      case ITEMS.PINE_LEAVES:
        drawMiniBlock('pine_leaves', 'pine_leaves');
        break;
      case ITEMS.COAL_ORE:
        drawMiniBlock('coal_ore', 'coal_ore');
        break;
      case ITEMS.IRON_ORE:
        drawMiniBlock('iron_ore', 'iron_ore');
        break;
      case ITEMS.GOLD_ORE:
        drawMiniBlock('gold_ore', 'gold_ore');
        break;
      case ITEMS.CRYSTAL_ORE:
        drawMiniBlock('crystal_ore', 'crystal_ore');
        break;
      case ITEMS.CRAFTING_BENCH:
        drawMiniBlock('crafting_bench_top', 'crafting_bench_side');
        break;
      case ITEMS.CHARCOAL_SMELTER:
        drawMiniBlock('smelter_top', 'smelter_side', 'smelter_front');
        break;
      case ITEMS.STORAGE_CHEST:
        drawMiniBlock('chest_top', 'chest_side', 'chest_front');
        break;
      case 'block_brick':
        drawMiniBlock('brick', 'brick');
        break;
      case 'block_obsidian':
        drawMiniBlock('obsidian', 'obsidian');
        break;
      case 'block_bookshelf':
        drawMiniBlock('planks_oak', 'bookshelf');
        break;
      case 'block_mossy_cobblestone':
        drawMiniBlock('mossy_cobblestone', 'mossy_cobblestone');
        break;
      case 'block_clay':
        drawMiniBlock('clay', 'clay');
        break;
      case 'block_gravel':
        drawMiniBlock('gravel', 'gravel');
        break;
      case 'block_netherrack':
        drawMiniBlock('netherrack', 'netherrack');
        break;
      case 'block_end_stone':
        drawMiniBlock('end_stone', 'end_stone');
        break;
      case 'block_copper_ore':
        drawMiniBlock('copper_ore', 'copper_ore');
        break;
      case 'block_redstone_ore':
        drawMiniBlock('redstone_ore', 'redstone_ore');
        break;
      case 'block_lapis_ore':
        drawMiniBlock('lapis_ore', 'lapis_ore');
        break;
      case 'block_emerald_ore':
        drawMiniBlock('emerald_ore', 'emerald_ore');
        break;

      // Plants & Flat items
      case ITEMS.FLOWER_RED: {
        px('#2e7d32', 7, 7, 2, 8);
        px('#1b5e20', 5, 10, 2, 2);
        px('#1b5e20', 9, 9, 2, 2);
        px('#c62828', 5, 2, 6, 6);
        px('#e53935', 4, 3, 8, 4);
        px('#ff8a80', 6, 3, 4, 2);
        px('#fbc02d', 7, 4, 2, 2);
        break;
      }
      case ITEMS.FLOWER_YELLOW: {
        px('#2e7d32', 7, 6, 2, 9);
        px('#1b5e20', 4, 9, 3, 2);
        px('#f57f17', 5, 2, 6, 6);
        px('#fbc02d', 4, 3, 8, 4);
        px('#fff59d', 6, 3, 4, 2);
        px('#e65100', 7, 4, 2, 2);
        break;
      }
      case ITEMS.GRASS_PLANT: {
        px('#388e3c', 3, 5, 2, 10);
        px('#4caf50', 7, 2, 2, 13);
        px('#2e7d32', 11, 4, 2, 11);
        px('#81c784', 2, 7, 2, 7);
        px('#a5d6a7', 8, 3, 1, 9);
        break;
      }
      case ITEMS.MUSHROOM: {
        px('#d7ccc8', 6, 8, 4, 7);
        px('#bcaaa4', 6, 13, 4, 2);
        px('#b71c1c', 3, 2, 10, 6);
        px('#d32f2f', 2, 4, 12, 3);
        px('#ffffff', 4, 3, 2, 2);
        px('#ffffff', 9, 3, 2, 2);
        px('#ffffff', 6, 5, 2, 1);
        break;
      }
      case ITEMS.TORCH: {
        px('#5d4037', 7, 6, 2, 9);
        px('#4e342e', 8, 7, 1, 8);
        px('#e65100', 6, 2, 4, 4);
        px('#ff9800', 6, 3, 4, 3);
        px('#ffeb3b', 7, 2, 2, 3);
        px('#ffffff', 7, 3, 2, 1);
        break;
      }

      // --- MATERIALS & RESOURCES ---
      case ITEMS.TIMBER_PLANK: {
        px('#6d4c41', 2, 3, 12, 10);
        px('#8d6e63', 3, 4, 10, 8);
        px('#5d4037', 3, 7, 10, 1);
        px('#a1887f', 4, 5, 8, 1);
        px('#a1887f', 4, 9, 8, 1);
        px('#3e2723', 2, 3, 1, 10);
        px('#3e2723', 13, 3, 1, 10);
        break;
      }
      case ITEMS.FIBER_STICK: {
        px('#3e2723', 2, 13, 3, 2);
        px('#5d4037', 4, 11, 3, 3);
        px('#8d6e63', 6, 9, 3, 3);
        px('#a1887f', 8, 7, 3, 3);
        px('#8d6e63', 10, 5, 3, 3);
        px('#d7ccc8', 12, 3, 2, 3);
        px('#bcaaa4', 13, 2, 2, 2);
        break;
      }
      case ITEMS.COAL_LUMP: {
        px('#1c1c1e', 3, 4, 10, 8);
        px('#2c2c2e', 4, 3, 8, 10);
        px('#3a3a3c', 5, 5, 4, 4);
        px('#636366', 6, 4, 2, 2);
        px('#48484a', 8, 8, 3, 2);
        px('#000000', 3, 7, 2, 4);
        break;
      }
      case ITEMS.IRON_INGOT: {
        px('#48484a', 2, 6, 12, 6);
        px('#8e8e93', 3, 5, 10, 6);
        px('#d1d1d6', 4, 5, 8, 2);
        px('#ffffff', 5, 5, 4, 1);
        px('#636366', 3, 9, 10, 2);
        px('#2c2c2e', 2, 11, 12, 1);
        break;
      }
      case ITEMS.GOLD_INGOT: {
        px('#b45309', 2, 6, 12, 6);
        px('#f59e0b', 3, 5, 10, 6);
        px('#fbbf24', 4, 5, 8, 2);
        px('#fef08a', 5, 5, 4, 1);
        px('#d97706', 3, 9, 10, 2);
        px('#78350f', 2, 11, 12, 1);
        break;
      }
      case ITEMS.CRYSTAL_SHARD: {
        px('#006064', 7, 1, 2, 14);
        px('#00acc1', 5, 3, 6, 10);
        px('#26c6da', 6, 4, 4, 8);
        px('#80deea', 6, 2, 3, 5);
        px('#e0f7fa', 7, 2, 2, 3);
        px('#ffffff', 7, 3, 1, 2);
        px('#00838f', 4, 6, 2, 5);
        px('#00838f', 10, 6, 2, 5);
        break;
      }
      case 'mat_emerald': {
        px('#064e3b', 7, 2, 2, 12);
        px('#059669', 5, 4, 6, 8);
        px('#10b981', 6, 5, 4, 6);
        px('#34d399', 6, 3, 3, 4);
        px('#a7f3d0', 7, 3, 2, 2);
        px('#ffffff', 7, 4, 1, 1);
        break;
      }
      case 'mat_redstone': {
        px('#7f1d1d', 4, 9, 8, 4);
        px('#dc2626', 5, 7, 6, 6);
        px('#ef4444', 6, 5, 4, 6);
        px('#f87171', 7, 4, 2, 4);
        px('#fef2f2', 7, 5, 1, 1);
        break;
      }
      case 'mat_copper_ingot': {
        px('#7c2d12', 2, 6, 12, 6);
        px('#ea580c', 3, 5, 10, 6);
        px('#f97316', 4, 5, 8, 2);
        px('#ffedd5', 5, 5, 4, 1);
        px('#c2410c', 3, 9, 10, 2);
        break;
      }
      case 'mat_lapis': {
        px('#172554', 4, 4, 8, 8);
        px('#1d4ed8', 5, 5, 6, 6);
        px('#2563eb', 6, 6, 4, 4);
        px('#93c5fd', 6, 5, 2, 2);
        px('#fde047', 9, 8, 1, 1);
        break;
      }
      case ITEMS.ANIMAL_HIDE: {
        px('#4e342e', 3, 3, 10, 10);
        px('#795548', 4, 4, 8, 8);
        px('#a1887f', 5, 5, 6, 6);
        px('#3e2723', 2, 2, 2, 3);
        px('#3e2723', 12, 2, 2, 3);
        px('#3e2723', 2, 11, 2, 3);
        px('#3e2723', 12, 11, 2, 3);
        px('#d7ccc8', 6, 6, 4, 3);
        break;
      }
      case ITEMS.BOAR_TUSK: {
        px('#5d4037', 2, 13, 3, 2);
        px('#d7ccc8', 3, 9, 3, 4);
        px('#f5f5f5', 5, 5, 4, 4);
        px('#ffffff', 8, 2, 4, 3);
        px('#bcaaa4', 4, 11, 2, 2);
        break;
      }
      case ITEMS.DARK_FRAGMENT: {
        px('#1a0933', 3, 4, 10, 8);
        px('#3b1261', 4, 3, 8, 9);
        px('#6b21a8', 5, 5, 5, 5);
        px('#a855f7', 6, 4, 2, 2);
        px('#0d0221', 2, 6, 2, 5);
        break;
      }
      case ITEMS.SHADOW_ESSENCE: {
        px('#1e1b4b', 3, 3, 10, 10);
        px('#4338ca', 4, 4, 8, 8);
        px('#6366f1', 5, 5, 6, 6);
        px('#818cf8', 6, 6, 3, 3);
        px('#c7d2fe', 7, 7, 2, 2);
        px('#ffffff', 7, 7, 1, 1);
        break;
      }

      // --- PICKAXES ---
      case ITEMS.WOOD_PICKAXE:
      case ITEMS.STONE_PICKAXE:
      case ITEMS.IRON_PICKAXE:
      case ITEMS.CRYSTAL_PICKAXE: {
        const matColors = {
          [ITEMS.WOOD_PICKAXE]: { head: '#8d6e63', light: '#bcaaa4', dark: '#4e342e' },
          [ITEMS.STONE_PICKAXE]: { head: '#757575', light: '#bdbdbd', dark: '#424242' },
          [ITEMS.IRON_PICKAXE]: { head: '#cfd8dc', light: '#ffffff', dark: '#78909c' },
          [ITEMS.CRYSTAL_PICKAXE]: { head: '#00e5ff', light: '#e0f7fa', dark: '#00838f' },
        }[itemId];

        // Stick handle
        px('#5d4037', 2, 13, 2, 2);
        px('#795548', 4, 11, 2, 2);
        px('#8d6e63', 6, 9, 2, 2);
        px('#a1887f', 8, 7, 2, 2);
        px('#bcaaa4', 10, 5, 2, 2);

        // Pickaxe head arch
        px(matColors.dark, 5, 2, 8, 3);
        px(matColors.head, 3, 3, 4, 3);
        px(matColors.head, 10, 3, 4, 3);
        px(matColors.head, 2, 5, 2, 3);
        px(matColors.head, 13, 5, 2, 3);
        px(matColors.light, 4, 2, 7, 1);
        px(matColors.light, 2, 4, 2, 1);
        px(matColors.dark, 1, 7, 2, 2);
        px(matColors.dark, 14, 7, 2, 2);
        break;
      }

      // --- AXES ---
      case ITEMS.WOOD_AXE:
      case ITEMS.STONE_AXE:
      case ITEMS.IRON_AXE: {
        const matColors = {
          [ITEMS.WOOD_AXE]: { head: '#8d6e63', light: '#bcaaa4', dark: '#4e342e' },
          [ITEMS.STONE_AXE]: { head: '#757575', light: '#bdbdbd', dark: '#424242' },
          [ITEMS.IRON_AXE]: { head: '#cfd8dc', light: '#ffffff', dark: '#78909c' },
        }[itemId];

        // Handle
        px('#5d4037', 2, 13, 2, 2);
        px('#795548', 4, 11, 2, 2);
        px('#8d6e63', 6, 9, 2, 2);
        px('#a1887f', 8, 7, 2, 2);
        px('#bcaaa4', 10, 5, 2, 2);

        // Axe blade
        px(matColors.dark, 7, 2, 6, 5);
        px(matColors.head, 8, 2, 5, 6);
        px(matColors.head, 6, 3, 3, 4);
        px(matColors.light, 11, 2, 2, 7);
        px(matColors.light, 9, 2, 4, 1);
        px(matColors.dark, 7, 6, 2, 3);
        break;
      }

      // --- HOES ---
      case ITEMS.WOOD_HOE:
      case ITEMS.STONE_HOE:
      case ITEMS.IRON_HOE:
      case ITEMS.CRYSTAL_HOE: {
        const matColors = {
          [ITEMS.WOOD_HOE]: { head: '#8d6e63', light: '#bcaaa4', dark: '#4e342e' },
          [ITEMS.STONE_HOE]: { head: '#757575', light: '#bdbdbd', dark: '#424242' },
          [ITEMS.IRON_HOE]: { head: '#cfd8dc', light: '#ffffff', dark: '#78909c' },
          [ITEMS.CRYSTAL_HOE]: { head: '#00e5ff', light: '#e0f7fa', dark: '#00838f' },
        }[itemId];

        px('#5d4037', 2, 13, 2, 2);
        px('#795548', 4, 11, 2, 2);
        px('#8d6e63', 6, 9, 2, 2);
        px('#a1887f', 8, 7, 2, 2);
        px('#bcaaa4', 10, 5, 2, 2);

        px(matColors.dark, 6, 2, 7, 3);
        px(matColors.head, 5, 3, 7, 3);
        px(matColors.head, 4, 4, 3, 3);
        px(matColors.light, 6, 2, 6, 1);
        px(matColors.light, 4, 4, 1, 3);
        break;
      }

      // --- SWORDS ---
      case ITEMS.WOOD_SWORD:
      case ITEMS.STONE_SWORD:
      case ITEMS.IRON_SWORD:
      case ITEMS.CRYSTAL_SWORD: {
        const matColors = {
          [ITEMS.WOOD_SWORD]: { blade: '#8d6e63', light: '#bcaaa4', dark: '#4e342e', guard: '#3e2723' },
          [ITEMS.STONE_SWORD]: { blade: '#757575', light: '#bdbdbd', dark: '#424242', guard: '#212121' },
          [ITEMS.IRON_SWORD]: { blade: '#cfd8dc', light: '#ffffff', dark: '#78909c', guard: '#b45309' },
          [ITEMS.CRYSTAL_SWORD]: { blade: '#00e5ff', light: '#e0f7fa', dark: '#00838f', guard: '#4338ca' },
        }[itemId];

        // Pommel & grip
        px('#3e2723', 1, 14, 2, 2);
        px('#5d4037', 2, 13, 2, 2);
        px('#795548', 3, 12, 2, 2);

        // Crossguard
        px(matColors.guard, 3, 10, 2, 3);
        px(matColors.guard, 5, 12, 3, 2);
        px(matColors.guard, 4, 11, 3, 3);

        // Long blade
        px(matColors.dark, 5, 9, 3, 3);
        px(matColors.blade, 6, 8, 3, 3);
        px(matColors.blade, 7, 7, 3, 3);
        px(matColors.blade, 8, 6, 3, 3);
        px(matColors.blade, 9, 5, 3, 3);
        px(matColors.blade, 10, 4, 3, 3);
        px(matColors.blade, 11, 3, 3, 3);
        px(matColors.light, 12, 2, 3, 3);
        px(matColors.light, 13, 1, 2, 2);
        break;
      }

      // --- ARMOR: HELMETS ---
      case ITEMS.IRON_HELMET:
      case ITEMS.CRYSTAL_HELMET: {
        const isCrys = itemId === ITEMS.CRYSTAL_HELMET;
        const main = isCrys ? '#00e5ff' : '#b0bec5';
        const light = isCrys ? '#e0f7fa' : '#eceff1';
        const dark = isCrys ? '#00838f' : '#546e7a';
        const visor = isCrys ? '#311b92' : '#1c2529';

        px(dark, 3, 3, 10, 10);
        px(main, 4, 2, 8, 10);
        px(light, 5, 2, 6, 2);
        px(visor, 4, 7, 8, 3);
        px(main, 3, 6, 2, 5);
        px(main, 11, 6, 2, 5);
        if (isCrys) {
          // Crown points
          px('#00e5ff', 3, 1, 2, 2);
          px('#e0f7fa', 7, 0, 2, 3);
          px('#00e5ff', 11, 1, 2, 2);
        }
        break;
      }

      // --- ARMOR: CHESTPLATES ---
      case ITEMS.IRON_CHESTPLATE:
      case ITEMS.CRYSTAL_CHESTPLATE: {
        const isCrys = itemId === ITEMS.CRYSTAL_CHESTPLATE;
        const main = isCrys ? '#00e5ff' : '#b0bec5';
        const light = isCrys ? '#e0f7fa' : '#eceff1';
        const dark = isCrys ? '#00838f' : '#546e7a';

        // Pauldrons
        px(dark, 1, 2, 4, 5);
        px(dark, 11, 2, 4, 5);
        px(light, 2, 2, 3, 2);
        px(light, 11, 2, 3, 2);

        // Torso / Breastplate
        px(dark, 4, 3, 8, 10);
        px(main, 4, 4, 8, 8);
        px(light, 5, 4, 6, 2);
        px(light, 7, 4, 2, 7);
        px(dark, 5, 9, 6, 3);
        px(main, 3, 11, 10, 2);
        break;
      }

      // --- ARMOR: LEGGINGS ---
      case ITEMS.IRON_LEGGINGS:
      case ITEMS.CRYSTAL_LEGGINGS: {
        const isCrys = itemId === ITEMS.CRYSTAL_LEGGINGS;
        const main = isCrys ? '#00e5ff' : '#b0bec5';
        const light = isCrys ? '#e0f7fa' : '#eceff1';
        const dark = isCrys ? '#00838f' : '#546e7a';

        // Belt
        px(dark, 3, 2, 10, 3);
        px(light, 4, 2, 8, 1);

        // Legs
        px(dark, 3, 5, 4, 9);
        px(main, 4, 5, 3, 8);
        px(light, 4, 6, 1, 6);

        px(dark, 9, 5, 4, 9);
        px(main, 9, 5, 3, 8);
        px(light, 9, 6, 1, 6);
        break;
      }

      // --- ARMOR: BOOTS ---
      case ITEMS.IRON_BOOTS:
      case ITEMS.CRYSTAL_BOOTS: {
        const isCrys = itemId === ITEMS.CRYSTAL_BOOTS;
        const main = isCrys ? '#00e5ff' : '#b0bec5';
        const light = isCrys ? '#e0f7fa' : '#eceff1';
        const dark = isCrys ? '#00838f' : '#546e7a';

        // Left Boot
        px(dark, 2, 6, 4, 8);
        px(main, 3, 6, 3, 7);
        px(dark, 1, 11, 5, 3);
        px(light, 2, 11, 3, 1);

        // Right Boot
        px(dark, 9, 6, 4, 8);
        px(main, 10, 6, 3, 7);
        px(dark, 9, 11, 5, 3);
        px(light, 10, 11, 3, 1);
        break;
      }

      // --- SEEDS ---
      case ITEMS.SEEDS_WHEAT: {
        px('#f59e0b', 4, 5, 3, 2);
        px('#d97706', 8, 3, 3, 2);
        px('#fbbf24', 9, 8, 3, 3);
        px('#b45309', 5, 10, 3, 2);
        px('#84cc16', 7, 6, 2, 2);
        break;
      }
      case ITEMS.SEEDS_BERRY: {
        px('#ec4899', 4, 5, 3, 3);
        px('#db2777', 8, 4, 3, 3);
        px('#be185d', 6, 9, 3, 3);
        px('#10b981', 8, 8, 2, 2);
        break;
      }
      case ITEMS.SEEDS_ROOT: {
        px('#ea580c', 4, 6, 4, 4);
        px('#f97316', 8, 4, 4, 4);
        px('#c2410c', 6, 10, 4, 4);
        px('#22c55e', 7, 7, 2, 3);
        break;
      }

      // --- FOOD ---
      case ITEMS.WHEAT: {
        px('#854d0e', 7, 2, 2, 12);
        px('#facc15', 5, 3, 6, 3);
        px('#eab308', 4, 5, 8, 4);
        px('#ca8a04', 5, 8, 6, 4);
        px('#fef08a', 6, 3, 2, 2);
        break;
      }
      case ITEMS.ROOT_VEGETABLE: {
        px('#15803d', 7, 1, 2, 4);
        px('#22c55e', 5, 2, 6, 2);
        px('#ea580c', 5, 4, 6, 5);
        px('#f97316', 6, 6, 4, 5);
        px('#c2410c', 7, 10, 2, 4);
        px('#fed7aa', 6, 5, 2, 2);
        break;
      }
      case ITEMS.RAW_MEAT: {
        px('#7f1d1d', 3, 4, 10, 8);
        px('#dc2626', 4, 4, 8, 7);
        px('#ef4444', 5, 5, 6, 5);
        px('#fecaca', 4, 6, 3, 2);
        px('#ffffff', 9, 7, 2, 2);
        px('#450a0a', 2, 7, 2, 4);
        break;
      }
      case ITEMS.COOKED_MEAT: {
        px('#451a03', 3, 4, 10, 8);
        px('#78350f', 4, 4, 8, 7);
        px('#92400e', 5, 5, 6, 5);
        px('#d97706', 5, 5, 4, 2);
        px('#ffffff', 9, 7, 2, 2);
        px('#292524', 5, 7, 4, 1);
        px('#292524', 5, 9, 4, 1);
        break;
      }
      case ITEMS.WILD_BERRIES: {
        px('#15803d', 7, 2, 2, 4);
        px('#9d174d', 3, 6, 5, 5);
        px('#db2777', 4, 6, 3, 3);
        px('#f472b6', 4, 7, 1, 1);

        px('#831843', 8, 5, 5, 5);
        px('#be185d', 9, 5, 3, 3);
        px('#f472b6', 9, 6, 1, 1);

        px('#701a75', 6, 9, 5, 5);
        px('#a21caf', 7, 9, 3, 3);
        break;
      }
      case ITEMS.MUSHROOM_STEW: {
        // Wooden bowl
        px('#78350f', 2, 7, 12, 6);
        px('#92400e', 3, 7, 10, 5);
        px('#b45309', 3, 6, 10, 2);
        // Savory broth
        px('#ca8a04', 4, 6, 8, 3);
        px('#eab308', 5, 6, 6, 2);
        // Mushroom slices & herbs
        px('#b91c1c', 5, 6, 2, 2);
        px('#ffffff', 5, 6, 1, 1);
        px('#15803d', 8, 6, 2, 1);
        break;
      }
      case ITEMS.DESERT_FRUIT: {
        px('#166534', 7, 2, 2, 3);
        px('#be123c', 4, 4, 8, 8);
        px('#e11d48', 5, 5, 6, 6);
        px('#fb7185', 6, 5, 3, 3);
        px('#ffe4e6', 7, 6, 1, 1);
        break;
      }
      case ITEMS.COOKED_RATION: {
        px('#292524', 2, 4, 12, 8);
        px('#78350f', 3, 5, 10, 6);
        px('#a16207', 4, 6, 8, 4);
        px('#15803d', 4, 5, 3, 2);
        px('#f59e0b', 8, 6, 3, 2);
        break;
      }

      default:
        // Generic fallback box
        px('#4a4a58', 2, 2, 12, 12);
        px('#71717a', 3, 3, 10, 10);
        px('#a1a1aa', 4, 4, 4, 4);
        break;
    }

    ctx.restore();
  }

  /**
   * Get an armor silhouette outline icon for empty equipment slots
   */
  getArmorSlotSilhouette(slotType) {
    const key = `silhouette_${slotType}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const scale = 2;

    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(pxX * scale, pxY * scale, pxW * scale, pxH * scale);
    };

    const color = 'rgba(255, 255, 255, 0.22)';
    const dark = 'rgba(0, 0, 0, 0.45)';

    switch (slotType) {
      case 'head':
        px(color, 4, 3, 8, 8);
        px(color, 3, 5, 10, 6);
        px(dark, 5, 7, 6, 2);
        break;
      case 'chest':
        px(color, 2, 3, 4, 4);
        px(color, 10, 3, 4, 4);
        px(color, 4, 4, 8, 9);
        px(dark, 6, 5, 4, 6);
        break;
      case 'legs':
        px(color, 3, 3, 10, 3);
        px(color, 3, 6, 4, 8);
        px(color, 9, 6, 4, 8);
        break;
      case 'feet':
        px(color, 2, 7, 5, 6);
        px(color, 1, 10, 6, 3);
        px(color, 9, 7, 5, 6);
        px(color, 9, 10, 6, 3);
        break;
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  /**
   * Get a pixel-art heart icon (full, half, empty)
   */
  getHeartIconUrl(state = 'full') {
    const key = `heart_${state}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 18;
    canvas.height = 18;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const scale = 1;

    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(pxX, pxY, pxW, pxH);
    };

    // Outer dark border for all heart states
    px('#111111', 2, 1, 4, 1);
    px('#111111', 8, 1, 4, 1);
    px('#111111', 1, 2, 1, 4);
    px('#111111', 6, 2, 2, 2);
    px('#111111', 12, 2, 1, 4);
    px('#111111', 1, 6, 1, 2);
    px('#111111', 12, 6, 1, 2);
    px('#111111', 2, 8, 1, 2);
    px('#111111', 11, 8, 1, 2);
    px('#111111', 3, 10, 1, 2);
    px('#111111', 10, 10, 1, 2);
    px('#111111', 4, 12, 1, 1);
    px('#111111', 9, 12, 1, 1);
    px('#111111', 5, 13, 1, 1);
    px('#111111', 8, 13, 1, 1);
    px('#111111', 6, 14, 2, 1);

    // Interior background
    px('#2b1313', 2, 2, 4, 6);
    px('#2b1313', 8, 2, 4, 6);
    px('#2b1313', 6, 4, 2, 4);
    px('#2b1313', 3, 8, 8, 2);
    px('#2b1313', 4, 10, 6, 2);
    px('#2b1313', 5, 12, 4, 1);
    px('#2b1313', 6, 13, 2, 1);

    if (state === 'full') {
      // Full Red Heart
      px('#b91c1c', 2, 2, 4, 6);
      px('#b91c1c', 8, 2, 4, 6);
      px('#b91c1c', 6, 4, 2, 4);
      px('#b91c1c', 3, 8, 8, 2);
      px('#b91c1c', 4, 10, 6, 2);
      px('#b91c1c', 5, 12, 4, 1);
      px('#b91c1c', 6, 13, 2, 1);

      // Bright crimson body
      px('#dc2626', 3, 3, 3, 4);
      px('#dc2626', 8, 3, 3, 4);
      px('#dc2626', 4, 7, 6, 3);
      px('#dc2626', 5, 10, 4, 2);

      // Specular shine
      px('#ffffff', 3, 2, 2, 1);
      px('#ffffff', 2, 3, 1, 2);
      px('#fca5a5', 3, 3, 1, 1);
    } else if (state === 'half') {
      // Half Red Heart (Left half red, Right half dark)
      px('#b91c1c', 2, 2, 4, 6);
      px('#b91c1c', 6, 4, 1, 4);
      px('#b91c1c', 3, 8, 4, 2);
      px('#b91c1c', 4, 10, 3, 2);
      px('#b91c1c', 5, 12, 2, 1);
      px('#b91c1c', 6, 13, 1, 1);

      px('#dc2626', 3, 3, 3, 4);
      px('#dc2626', 4, 7, 3, 3);
      px('#dc2626', 5, 10, 2, 2);

      // Specular shine
      px('#ffffff', 3, 2, 2, 1);
      px('#ffffff', 2, 3, 1, 2);
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  /**
   * Get a pixel-art hunger / food icon (full, half, empty)
   */
  getHungerIconUrl(state = 'full') {
    const key = `hunger_${state}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 18;
    canvas.height = 18;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(pxX, pxY, pxW, pxH);
    };

    // Dark outline of drumstick
    px('#111111', 7, 1, 5, 1);
    px('#111111', 5, 2, 2, 1);
    px('#111111', 12, 2, 2, 1);
    px('#111111', 4, 3, 1, 4);
    px('#111111', 14, 3, 1, 4);
    px('#111111', 5, 7, 1, 2);
    px('#111111', 13, 7, 1, 2);
    px('#111111', 6, 9, 2, 1);
    px('#111111', 11, 9, 2, 1);
    px('#111111', 8, 10, 3, 1);
    // Bone handle
    px('#111111', 7, 11, 1, 4);
    px('#111111', 11, 11, 1, 4);
    px('#111111', 6, 14, 2, 1);
    px('#111111', 11, 14, 2, 1);
    px('#111111', 7, 15, 5, 1);

    // Interior bone
    px('#e2e8f0', 8, 11, 3, 3);
    px('#cbd5e1', 7, 14, 1, 1);
    px('#cbd5e1', 11, 14, 1, 1);
    px('#94a3b8', 9, 14, 1, 1);

    // Empty state background
    px('#2e2015', 5, 3, 9, 4);
    px('#2e2015', 6, 7, 7, 2);
    px('#2e2015', 8, 9, 3, 1);

    if (state === 'full') {
      // Rich roasted golden-brown meat
      px('#78350f', 5, 3, 9, 4);
      px('#78350f', 6, 7, 7, 2);
      px('#78350f', 8, 9, 3, 1);

      px('#b45309', 6, 3, 7, 3);
      px('#d97706', 7, 4, 5, 2);
      px('#f59e0b', 8, 4, 3, 1);
      px('#ffffff', 9, 3, 2, 1);
    } else if (state === 'half') {
      px('#78350f', 5, 3, 5, 4);
      px('#78350f', 6, 7, 3, 2);
      px('#b45309', 6, 3, 3, 3);
      px('#d97706', 7, 4, 2, 2);
      px('#ffffff', 7, 3, 1, 1);
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  /**
   * Get an animated pixel flame frame (0 to 3) for Smelter / Kiln
   */
  getFlameIconUrl(frame = 0) {
    const key = `flame_${frame % 4}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(pxX, pxY, pxW, pxH);
    };

    const f = frame % 4;

    // Outer dark charcoal border
    px('#1c1917', 8, 20 - (f % 2), 8, 2);
    px('#1c1917', 6, 16, 2, 4);
    px('#1c1917', 16, 16, 2, 4);
    px('#1c1917', 5, 11, 2, 5);
    px('#1c1917', 17, 11, 2, 5);
    px('#1c1917', 7, 6, 3, 5);
    px('#1c1917', 14, 6, 3, 5);
    px('#1c1917', 10 + (f % 2 ? 1 : -1), 2 + (f === 1 ? 1 : 0), 4, 4);

    // Outer flame (Deep Crimson / Amber)
    px('#c2410c', 8, 14, 8, 6);
    px('#c2410c', 7, 10, 10, 5);
    px('#ea580c', 8, 8, 8, 6);

    // Mid flame (Bright Orange)
    px('#f97316', 9, 11, 6, 7);
    px('#f97316', 10, 6 + (f % 3), 4, 6);

    // Inner hot core (Golden Yellow / White)
    px('#facc15', 10, 13, 4, 5);
    px('#fef08a', 11, 14, 2, 3);
    px('#ffffff', 11, 15, 2, 2);

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  /**
   * Get a shield / defense icon
   */
  getShieldIconUrl() {
    const key = 'shield_icon';
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 18;
    canvas.height = 18;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const px = (color, pxX, pxY, pxW = 1, pxH = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(pxX, pxY, pxW, pxH);
    };

    px('#111111', 2, 2, 14, 2);
    px('#111111', 1, 4, 2, 7);
    px('#111111', 15, 4, 2, 7);
    px('#111111', 3, 11, 2, 3);
    px('#111111', 13, 11, 2, 3);
    px('#111111', 5, 14, 2, 2);
    px('#111111', 11, 14, 2, 2);
    px('#111111', 7, 16, 4, 1);

    // Metallic body
    px('#64748b', 3, 4, 12, 7);
    px('#64748b', 5, 11, 8, 3);
    px('#64748b', 7, 14, 4, 2);

    // Highlight
    px('#94a3b8', 4, 4, 5, 6);
    px('#cbd5e1', 5, 5, 3, 2);
    px('#334155', 9, 4, 5, 6);

    const dataUrl = canvas.toDataURL('image/png');
    this.cache.set(key, dataUrl);
    return dataUrl;
  }
}
