import * as THREE from 'three';
import { RAW_CUSTOM_PIXELS } from './RawCustomPixels.js';

/**
 * Procedural HD Voxel Texture Atlas Generator for MINICRAFT V7.
 * Creates an original, richly detailed 16x16-pixel tile texture sheet (16x16 grid = 256x256)
 * with classic, cohesive pixel-art voxel sandbox aesthetics inspired by timeless sandbox classics.
 * Zero external copyrighted assets.
 */
export class TextureAtlas {
  constructor() {
    this.tileSize = 16;
    this.cols = 16;
    this.rows = 16;
    this.width = this.cols * this.tileSize;   // 256px
    this.height = this.rows * this.tileSize; // 256px

    this.tileIndices = {
      grass_top: 0,
      grass_side: 1,
      dirt: 2,
      stone: 3,
      cobblestone: 4,
      sand: 5,
      sandstone_top: 6,
      sandstone_side: 7,
      wood_side: 8,
      wood_top: 9,
      planks_oak: 10,
      pine_wood_side: 11,
      pine_wood_top: 12,
      planks_pine: 13,
      leaves: 14,
      pine_leaves: 15,
      snow_top: 16,
      snow_side: 17,
      ice: 18,
      cactus_top: 19,
      cactus_side: 20,
      flower_red: 21,
      flower_yellow: 22,
      grass_plant: 23,
      mushroom: 24,
      mushroom_brown: 25,
      coal_ore: 26,
      iron_ore: 27,
      gold_ore: 28,
      crystal_ore: 29,
      bedrock: 30,
      water: 31,
      glass: 32,
      brick: 33,
      crafting_bench_top: 34,
      crafting_bench_side: 35,
      smelter_front: 36,
      smelter_front_active: 37,
      smelter_side: 38,
      smelter_top: 39,
      chest_top: 40,
      chest_front: 41,
      chest_side: 42,
      tilled_soil_top: 43,
      tilled_soil_side: 44,
      crop_wheat_1: 45,
      crop_wheat_2: 46,
      crop_wheat_3: 47,
      crop_berry_1: 48,
      crop_berry_2: 49,
      crop_berry_3: 50,
      crop_root_1: 51,
      crop_root_2: 52,
      crop_root_3: 53,
      torch: 54,
      obsidian: 55,
      copper_ore: 56,
      redstone_ore: 57,
      lapis_ore: 58,
      emerald_ore: 59,
      clay: 60,
      gravel: 61,
      bookshelf: 62,
      mossy_cobblestone: 63,
      netherrack: 64,
      end_stone: 65,
      vines: 66,
      tall_grass: 67,
      lava: 68,
      deepslate_top: 69,
      deepslate_side: 70,
      deepslate_coal_ore: 71,
      deepslate_iron_ore: 72,
      deepslate_gold_ore: 73,
      deepslate_crystal_ore: 74,
      deepslate_copper_ore: 75,
      deepslate_redstone_ore: 76,
      deepslate_lapis_ore: 77,
      deepslate_emerald_ore: 78,
      granite: 79,
      diorite: 80,
      andesite: 81,
      tuff: 82,
    };

    if (typeof document === 'undefined') {
      this.texture = new THREE.Texture();
      return;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    this._generateTextures();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  _getTileCoords(index) {
    const col = index % this.cols;
    const row = Math.floor(index / this.cols);
    return { x: col * this.tileSize, y: row * this.tileSize };
  }

  getTileUV(tileNameOrIndex) {
    let tileIndex = 0;
    if (typeof tileNameOrIndex === 'number') {
      tileIndex = tileNameOrIndex;
    } else if (this.tileIndices[tileNameOrIndex] !== undefined) {
      tileIndex = this.tileIndices[tileNameOrIndex];
    }

    const col = tileIndex % this.cols;
    const row = Math.floor(tileIndex / this.cols);

    // Half-pixel inset boundary to completely eliminate neighboring tile bleeding
    const u0 = (col * this.tileSize + 0.5) / this.width;
    const u1 = ((col + 1) * this.tileSize - 0.5) / this.width;

    // Three.js CanvasTexture has flipY = true by default.
    // Row 0 (top row in 2D canvas) maps to the top of the texture (V = 1.0).
    const v0 = ((this.rows - 1 - row) * this.tileSize + 0.5) / this.height;
    const v1 = ((this.rows - row) * this.tileSize - 0.5) / this.height;

    return { u0, v0, u1, v1 };
  }

  getUVs(tileNameOrIndex) {
    return this.getTileUV(tileNameOrIndex);
  }

  _generateTextures() {
    const s = this.tileSize;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Precise pixel drawer helper
    const px = (tx, ty, x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(tx + x, ty + y, 1, 1);
    };

    // Rect drawer helper
    const rect = (tx, ty, x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(tx + x, ty + y, w, h);
    };

    // Helper to generate seamless deterministic pseudo-random noise
    const fillNoise = (tx, ty, baseR, baseG, baseB, scale, amp, contrast = 1.0) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const n1 = Math.sin(x * scale + y * (scale * 1.37)) * Math.cos(x * 1.73 - y * 2.19);
          const n2 = Math.sin((x + 8) * (scale * 0.7) - (y + 4) * 1.8) * 0.5;
          const raw = (n1 + n2) * amp * contrast;
          const r = Math.min(255, Math.max(0, Math.round(baseR + raw)));
          const g = Math.min(255, Math.max(0, Math.round(baseG + raw * 0.92)));
          const b = Math.min(255, Math.max(0, Math.round(baseB + raw * 0.85)));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(tx + x, ty + y, 1, 1);
        }
      }
    };

    // Helper to draw ore veins into stone base
    const drawOreVeins = (tCoords, gemColors, highlightColor, darkOutlineColor) => {
      // Draw stone base first
      const tStone = this._getTileCoords(3);
      ctx.drawImage(this.canvas, tStone.x, tStone.y, s, s, tCoords.x, tCoords.y, s, s);

      // Dark shadow crevices around ore clusters
      const outlines = [
        [3, 2, 4, 5], [9, 3, 5, 4], [2, 9, 5, 5], [9, 10, 5, 4]
      ];
      outlines.forEach(([ox, oy, ow, oh]) => {
        rect(tCoords.x, tCoords.y, ox, oy, ow, oh, darkOutlineColor);
      });

      // Cluster 1 (Top-Left)
      rect(tCoords.x, tCoords.y, 4, 3, 2, 3, gemColors[0]);
      rect(tCoords.x, tCoords.y, 5, 4, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 4, 3, highlightColor);
      if (gemColors[2]) px(tCoords.x, tCoords.y, 5, 5, gemColors[2]);

      // Cluster 2 (Top-Right)
      rect(tCoords.x, tCoords.y, 10, 4, 3, 2, gemColors[0]);
      rect(tCoords.x, tCoords.y, 11, 5, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 10, 4, highlightColor);
      px(tCoords.x, tCoords.y, 12, 5, highlightColor);

      // Cluster 3 (Bottom-Left)
      rect(tCoords.x, tCoords.y, 3, 10, 3, 3, gemColors[0]);
      rect(tCoords.x, tCoords.y, 4, 11, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 3, 10, highlightColor);
      if (gemColors[2]) px(tCoords.x, tCoords.y, 5, 12, gemColors[2]);

      // Cluster 4 (Bottom-Right)
      rect(tCoords.x, tCoords.y, 10, 11, 3, 2, gemColors[0]);
      rect(tCoords.x, tCoords.y, 11, 12, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 10, 11, highlightColor);
    };

    // =========================================================================
    // 0. GRASS TOP (Index 0)
    // =========================================================================
    const tGrassTop = this._getTileCoords(0);
    fillNoise(tGrassTop.x, tGrassTop.y, 75, 155, 42, 2.2, 22);
    // Vibrant grass tufts and multi-toned blades
    rect(tGrassTop.x, tGrassTop.y, 2, 2, 3, 2, '#48a825');
    rect(tGrassTop.x, tGrassTop.y, 7, 5, 3, 3, '#57be2e');
    rect(tGrassTop.x, tGrassTop.y, 12, 9, 3, 2, '#48a825');
    rect(tGrassTop.x, tGrassTop.y, 3, 11, 4, 3, '#3b921c');
    rect(tGrassTop.x, tGrassTop.y, 10, 2, 3, 2, '#57be2e');

    // Sunlit blade tips
    px(tGrassTop.x, tGrassTop.y, 3, 2, '#7ee24e');
    px(tGrassTop.x, tGrassTop.y, 8, 5, '#8ef45e');
    px(tGrassTop.x, tGrassTop.y, 13, 9, '#7ee24e');
    px(tGrassTop.x, tGrassTop.y, 4, 11, '#6cd53f');
    px(tGrassTop.x, tGrassTop.y, 11, 2, '#8ef45e');
    px(tGrassTop.x, tGrassTop.y, 6, 13, '#9bf76d');

    // Shaded root depths
    px(tGrassTop.x, tGrassTop.y, 4, 4, '#246310');
    px(tGrassTop.x, tGrassTop.y, 9, 7, '#1f590d');
    px(tGrassTop.x, tGrassTop.y, 14, 11, '#246310');
    px(tGrassTop.x, tGrassTop.y, 2, 13, '#1f590d');
    px(tGrassTop.x, tGrassTop.y, 11, 4, '#246310');

    // =========================================================================
    // 2. DIRT (Index 2)
    // =========================================================================
    const tDirt = this._getTileCoords(2);
    fillNoise(tDirt.x, tDirt.y, 118, 80, 50, 2.4, 20);
    // Dark loam chunks & lighter quartz pebbles
    rect(tDirt.x, tDirt.y, 3, 3, 3, 2, '#52331c');
    rect(tDirt.x, tDirt.y, 9, 5, 3, 3, '#462b16');
    rect(tDirt.x, tDirt.y, 4, 10, 4, 2, '#52331c');
    rect(tDirt.x, tDirt.y, 11, 11, 3, 3, '#462b16');
    rect(tDirt.x, tDirt.y, 1, 7, 2, 2, '#52331c');

    // Warm loam highlights
    rect(tDirt.x, tDirt.y, 7, 2, 2, 2, '#9c6c44');
    rect(tDirt.x, tDirt.y, 2, 12, 2, 2, '#9c6c44');
    rect(tDirt.x, tDirt.y, 12, 2, 2, 1, '#b07d50');
    rect(tDirt.x, tDirt.y, 7, 9, 3, 1, '#b07d50');
    px(tDirt.x, tDirt.y, 8, 2, '#c99363');
    px(tDirt.x, tDirt.y, 13, 13, '#c99363');
    px(tDirt.x, tDirt.y, 5, 6, '#38200e');
    px(tDirt.x, tDirt.y, 10, 8, '#38200e');

    // =========================================================================
    // 1. GRASS SIDE (Index 1) -> Rich dirt with hanging grass edge & drop shadow
    // =========================================================================
    const tGrassSide = this._getTileCoords(1);
    ctx.drawImage(this.canvas, tDirt.x, tDirt.y, s, s, tGrassSide.x, tGrassSide.y, s, s);
    for (let x = 0; x < s; x++) {
      const hang = 3 + Math.floor(Math.sin(x * 1.35) * 1.9 + Math.cos(x * 0.72) * 1.3);
      for (let y = 0; y <= hang; y++) {
        const n = Math.sin(x * 1.7 + y * 2.3) * 15;
        const r = Math.min(255, Math.max(0, 75 + n));
        const g = Math.min(255, Math.max(0, 155 + n));
        const b = Math.min(255, Math.max(0, 42 + n));
        px(tGrassSide.x, tGrassSide.y, x, y, `rgb(${r|0},${g|0},${b|0})`);
      }
      // Grass tip highlight
      if (hang >= 3) {
        px(tGrassSide.x, tGrassSide.y, x, hang - 1, '#8ef45e');
      }
      // Hanging shadow under grass fringe
      px(tGrassSide.x, tGrassSide.y, x, hang + 1, '#2c190a');
    }

    // =========================================================================
    // 3. STONE (Index 3)
    // =========================================================================
    const tStone = this._getTileCoords(3);
    fillNoise(tStone.x, tStone.y, 122, 125, 132, 3.1, 18);
    // Basalt rock fractures & shadow crevices
    rect(tStone.x, tStone.y, 2, 4, 4, 1, '#565861');
    rect(tStone.x, tStone.y, 6, 5, 2, 2, '#464850');
    rect(tStone.x, tStone.y, 9, 8, 5, 1, '#565861');
    rect(tStone.x, tStone.y, 3, 11, 4, 2, '#464850');
    rect(tStone.x, tStone.y, 11, 12, 3, 2, '#565861');

    // Stone highlights & beveled edges
    rect(tStone.x, tStone.y, 7, 3, 3, 1, '#9fa3b0');
    rect(tStone.x, tStone.y, 2, 9, 3, 1, '#9fa3b0');
    rect(tStone.x, tStone.y, 10, 7, 2, 1, '#bcc1d1');
    rect(tStone.x, tStone.y, 4, 13, 2, 1, '#9fa3b0');
    px(tStone.x, tStone.y, 8, 3, '#d3d7e6');
    px(tStone.x, tStone.y, 3, 9, '#d3d7e6');

    // =========================================================================
    // 4. COBBLESTONE (Index 4)
    // =========================================================================
    const tCobble = this._getTileCoords(4);
    fillNoise(tCobble.x, tCobble.y, 110, 112, 118, 2.6, 16);
    // Interlocking masonry stones with deep mortar grooves
    rect(tCobble.x, tCobble.y, 0, 4, 16, 1, '#34363d');
    rect(tCobble.x, tCobble.y, 0, 9, 16, 1, '#34363d');
    rect(tCobble.x, tCobble.y, 0, 14, 16, 1, '#34363d');
    rect(tCobble.x, tCobble.y, 5, 0, 1, 4, '#34363d');
    rect(tCobble.x, tCobble.y, 11, 5, 1, 4, '#34363d');
    rect(tCobble.x, tCobble.y, 4, 10, 1, 4, '#34363d');
    rect(tCobble.x, tCobble.y, 13, 10, 1, 4, '#34363d');

    // Rounded stone face highlights
    rect(tCobble.x, tCobble.y, 1, 1, 3, 2, '#8d929e');
    rect(tCobble.x, tCobble.y, 7, 1, 4, 2, '#8d929e');
    rect(tCobble.x, tCobble.y, 1, 6, 4, 2, '#8d929e');
    rect(tCobble.x, tCobble.y, 6, 11, 5, 2, '#8d929e');
    rect(tCobble.x, tCobble.y, 12, 6, 3, 2, '#8d929e');
    px(tCobble.x, tCobble.y, 2, 1, '#b5bac7');
    px(tCobble.x, tCobble.y, 8, 1, '#b5bac7');
    px(tCobble.x, tCobble.y, 2, 6, '#b5bac7');
    px(tCobble.x, tCobble.y, 7, 11, '#b5bac7');

    // Deep shadow insets
    rect(tCobble.x, tCobble.y, 1, 3, 4, 1, '#4e5159');
    rect(tCobble.x, tCobble.y, 7, 3, 4, 1, '#4e5159');
    rect(tCobble.x, tCobble.y, 1, 8, 5, 1, '#4e5159');
    rect(tCobble.x, tCobble.y, 6, 13, 5, 1, '#4e5159');

    // =========================================================================
    // 5. SAND (Index 5)
    // =========================================================================
    const tSand = this._getTileCoords(5);
    fillNoise(tSand.x, tSand.y, 220, 190, 115, 2.3, 16);
    // Sand ridges & granular highlights
    rect(tSand.x, tSand.y, 3, 3, 4, 1, '#c99c40');
    rect(tSand.x, tSand.y, 9, 7, 5, 1, '#c99c40');
    rect(tSand.x, tSand.y, 2, 11, 4, 1, '#c99c40');
    rect(tSand.x, tSand.y, 4, 2, 3, 1, '#fde296');
    rect(tSand.x, tSand.y, 10, 6, 3, 1, '#fde296');
    rect(tSand.x, tSand.y, 3, 10, 3, 1, '#fde296');
    px(tSand.x, tSand.y, 5, 2, '#fff2c2');
    px(tSand.x, tSand.y, 11, 6, '#fff2c2');

    // =========================================================================
    // 6. SANDSTONE TOP (Index 6)
    // =========================================================================
    const tSandTop = this._getTileCoords(6);
    fillNoise(tSandTop.x, tSandTop.y, 210, 180, 115, 1.8, 12);
    rect(tSandTop.x, tSandTop.y, 0, 0, 16, 1, '#a67d32');
    rect(tSandTop.x, tSandTop.y, 0, 15, 16, 1, '#a67d32');
    rect(tSandTop.x, tSandTop.y, 0, 0, 1, 16, '#a67d32');
    rect(tSandTop.x, tSandTop.y, 15, 0, 1, 16, '#a67d32');
    rect(tSandTop.x, tSandTop.y, 2, 2, 12, 12, '#caa054');
    rect(tSandTop.x, tSandTop.y, 4, 4, 8, 8, '#e0b86c');

    // =========================================================================
    // 7. SANDSTONE SIDE (Index 7) -> Stratified layered stone
    // =========================================================================
    const tSandSide = this._getTileCoords(7);
    for (let y = 0; y < s; y++) {
      const layer = Math.floor(y / 4);
      const layerColor = layer % 2 === 0 ? { r: 220, g: 190, b: 125 } : { r: 195, g: 160, b: 100 };
      for (let x = 0; x < s; x++) {
        const grain = (Math.sin(x * 3.3) * 0.5 + 0.5) * 12 - 6;
        px(tSandSide.x, tSandSide.y, x, y, `rgb(${(layerColor.r + grain)|0}, ${(layerColor.g + grain)|0}, ${(layerColor.b + grain)|0})`);
      }
    }
    rect(tSandSide.x, tSandSide.y, 0, 4, 16, 1, '#8a6428');
    rect(tSandSide.x, tSandSide.y, 0, 8, 16, 1, '#8a6428');
    rect(tSandSide.x, tSandSide.y, 0, 12, 16, 1, '#8a6428');
    rect(tSandSide.x, tSandSide.y, 0, 5, 16, 1, '#fde296');
    rect(tSandSide.x, tSandSide.y, 0, 9, 16, 1, '#fde296');
    rect(tSandSide.x, tSandSide.y, 0, 13, 16, 1, '#fde296');

    // =========================================================================
    // 8. WOOD SIDE (Oak Log) (Index 8)
    // =========================================================================
    const tWoodSide = this._getTileCoords(8);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const bark = Math.sin(x * 1.57) * 22 + (Math.sin(x * 4.2 + y * 1.1) * 8);
        const r = Math.min(255, Math.max(0, 110 + bark));
        const g = Math.min(255, Math.max(0, 75 + bark * 0.7));
        const b = Math.min(255, Math.max(0, 42 + bark * 0.5));
        px(tWoodSide.x, tWoodSide.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
      }
    }
    // Deep vertical bark fissures
    for (let y = 0; y < s; y++) {
      px(tWoodSide.x, tWoodSide.y, 0, y, '#3c200c');
      px(tWoodSide.x, tWoodSide.y, 5, y, '#3c200c');
      px(tWoodSide.x, tWoodSide.y, 11, y, '#3c200c');
      px(tWoodSide.x, tWoodSide.y, 3, y, '#9c6638');
      px(tWoodSide.x, tWoodSide.y, 8, y, '#9c6638');
      px(tWoodSide.x, tWoodSide.y, 14, y, '#9c6638');
    }

    // =========================================================================
    // 9. WOOD TOP (Oak Log End) (Index 9)
    // =========================================================================
    const tWoodTop = this._getTileCoords(9);
    rect(tWoodTop.x, tWoodTop.y, 0, 0, 16, 16, '#4a2912');
    for (let y = 1; y < 15; y++) {
      for (let x = 1; x < 15; x++) {
        const dist = Math.hypot(x - 7.5, y - 7.5);
        const ring = Math.sin(dist * 2.35) * 18;
        const r = Math.min(255, Math.max(0, 192 + ring));
        const g = Math.min(255, Math.max(0, 148 + ring * 0.8));
        const b = Math.min(255, Math.max(0, 92 + ring * 0.55));
        px(tWoodTop.x, tWoodTop.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
      }
    }
    // Concentric growth ring outlines & core
    rect(tWoodTop.x, tWoodTop.y, 7, 7, 2, 2, '#7a481c');
    px(tWoodTop.x, tWoodTop.y, 0, 0, '#301807');
    px(tWoodTop.x, tWoodTop.y, 15, 0, '#301807');
    px(tWoodTop.x, tWoodTop.y, 0, 15, '#301807');
    px(tWoodTop.x, tWoodTop.y, 15, 15, '#301807');

    // =========================================================================
    // 10. PLANKS OAK (Index 10)
    // =========================================================================
    const tPlanksOak = this._getTileCoords(10);
    fillNoise(tPlanksOak.x, tPlanksOak.y, 175, 128, 78, 2.2, 12);
    // Plank dividing seams
    rect(tPlanksOak.x, tPlanksOak.y, 0, 3, 16, 1, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 7, 16, 1, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 11, 16, 1, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 15, 16, 1, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 8, 0, 1, 4, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 4, 4, 1, 4, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 12, 8, 1, 4, '#4e2d14');
    rect(tPlanksOak.x, tPlanksOak.y, 6, 12, 1, 4, '#4e2d14');

    // Bevel highlights & subtle nail heads
    rect(tPlanksOak.x, tPlanksOak.y, 0, 0, 16, 1, '#c49662');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 4, 16, 1, '#c49662');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 8, 16, 1, '#c49662');
    rect(tPlanksOak.x, tPlanksOak.y, 0, 12, 16, 1, '#c49662');
    px(tPlanksOak.x, tPlanksOak.y, 7, 1, '#341f10');
    px(tPlanksOak.x, tPlanksOak.y, 9, 1, '#341f10');
    px(tPlanksOak.x, tPlanksOak.y, 3, 5, '#341f10');
    px(tPlanksOak.x, tPlanksOak.y, 5, 5, '#341f10');

    // =========================================================================
    // 11. PINE WOOD SIDE (Index 11)
    // =========================================================================
    const tPineSide = this._getTileCoords(11);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const bark = Math.sin(x * 2.2) * 16 + (Math.sin(y * 1.5) * 8);
        const r = Math.min(255, Math.max(0, 68 + bark));
        const g = Math.min(255, Math.max(0, 48 + bark * 0.7));
        const b = Math.min(255, Math.max(0, 32 + bark * 0.5));
        px(tPineSide.x, tPineSide.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
      }
    }
    for (let y = 0; y < s; y++) {
      px(tPineSide.x, tPineSide.y, 1, y, '#22140b');
      px(tPineSide.x, tPineSide.y, 6, y, '#22140b');
      px(tPineSide.x, tPineSide.y, 12, y, '#22140b');
      px(tPineSide.x, tPineSide.y, 4, y, '#5e3f28');
      px(tPineSide.x, tPineSide.y, 9, y, '#5e3f28');
    }

    // =========================================================================
    // 12. PINE WOOD TOP (Index 12)
    // =========================================================================
    const tPineTop = this._getTileCoords(12);
    rect(tPineTop.x, tPineTop.y, 0, 0, 16, 16, '#28170c');
    for (let y = 1; y < 15; y++) {
      for (let x = 1; x < 15; x++) {
        const dist = Math.hypot(x - 7.5, y - 7.5);
        const ring = Math.sin(dist * 2.7) * 14;
        px(tPineTop.x, tPineTop.y, x, y, `rgb(${(140 + ring)|0}, ${(100 + ring * 0.8)|0}, ${(66 + ring * 0.6)|0})`);
      }
    }
    rect(tPineTop.x, tPineTop.y, 7, 7, 2, 2, '#4a2f1a');

    // =========================================================================
    // 13. PLANKS PINE (Index 13)
    // =========================================================================
    const tPlanksPine = this._getTileCoords(13);
    fillNoise(tPlanksPine.x, tPlanksPine.y, 118, 86, 56, 2.2, 12);
    rect(tPlanksPine.x, tPlanksPine.y, 0, 3, 16, 1, '#2a170b');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 7, 16, 1, '#2a170b');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 11, 16, 1, '#2a170b');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 15, 16, 1, '#2a170b');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 0, 16, 1, '#946e49');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 4, 16, 1, '#946e49');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 8, 16, 1, '#946e49');
    rect(tPlanksPine.x, tPlanksPine.y, 0, 12, 16, 1, '#946e49');

    // =========================================================================
    // 14. LEAVES (Oak Canopy) (Index 14)
    // =========================================================================
    const tLeaves = this._getTileCoords(14);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const noise = Math.sin(x * 4.1 + y * 3.3) * 0.5 + 0.5;
        if (noise > 0.16) {
          const shade = noise * 38;
          const r = Math.min(255, Math.max(0, 36 + shade * 0.6));
          const g = Math.min(255, Math.max(0, 138 + shade * 1.3));
          const b = Math.min(255, Math.max(0, 34 + shade * 0.5));
          px(tLeaves.x, tLeaves.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
        }
      }
    }
    // Bright sunlit foliage highlights
    rect(tLeaves.x, tLeaves.y, 3, 4, 2, 1, '#85ea4f');
    rect(tLeaves.x, tLeaves.y, 9, 8, 2, 1, '#85ea4f');
    rect(tLeaves.x, tLeaves.y, 5, 12, 2, 1, '#85ea4f');
    rect(tLeaves.x, tLeaves.y, 12, 3, 2, 1, '#85ea4f');

    // =========================================================================
    // 15. PINE LEAVES (Spruce Needles) (Index 15)
    // =========================================================================
    const tPineLeaves = this._getTileCoords(15);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const noise = Math.sin(x * 5.2 + y * 4.4) * 0.5 + 0.5;
        if (noise > 0.18) {
          const shade = noise * 30;
          const r = Math.min(255, Math.max(0, 20 + shade * 0.5));
          const g = Math.min(255, Math.max(0, 76 + shade * 1.1));
          const b = Math.min(255, Math.max(0, 28 + shade * 0.5));
          px(tPineLeaves.x, tPineLeaves.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
        }
      }
    }
    rect(tPineLeaves.x, tPineLeaves.y, 4, 4, 2, 1, '#429e4c');
    rect(tPineLeaves.x, tPineLeaves.y, 10, 9, 2, 1, '#429e4c');

    // =========================================================================
    // 16. SNOW TOP (Index 16)
    // =========================================================================
    const tSnowTop = this._getTileCoords(16);
    fillNoise(tSnowTop.x, tSnowTop.y, 240, 244, 255, 2.8, 10);
    rect(tSnowTop.x, tSnowTop.y, 3, 3, 3, 2, '#ffffff');
    rect(tSnowTop.x, tSnowTop.y, 10, 8, 3, 2, '#ffffff');
    rect(tSnowTop.x, tSnowTop.y, 7, 4, 2, 1, '#c6d6ea');
    rect(tSnowTop.x, tSnowTop.y, 4, 11, 2, 1, '#c6d6ea');
    rect(tSnowTop.x, tSnowTop.y, 12, 12, 2, 1, '#c6d6ea');

    // =========================================================================
    // 17. SNOW SIDE (Index 17) -> Dirt with thick snow blanket
    // =========================================================================
    const tSnowSide = this._getTileCoords(17);
    ctx.drawImage(this.canvas, tDirt.x, tDirt.y, s, s, tSnowSide.x, tSnowSide.y, s, s);
    for (let x = 0; x < s; x++) {
      const hang = 4 + Math.floor(Math.sin(x * 1.1) * 1.6 + Math.cos(x * 0.8) * 1.2);
      for (let y = 0; y <= hang; y++) {
        const n = Math.sin(x * 3.7 + y * 4.1) * 10;
        const val = Math.min(255, Math.max(220, 242 + n));
        px(tSnowSide.x, tSnowSide.y, x, y, `rgb(${val|0}, ${val|0}, ${Math.min(255, val + 10)|0})`);
      }
      px(tSnowSide.x, tSnowSide.y, x, hang + 1, '#9cb4ce');
    }

    // =========================================================================
    // 18. ICE (Index 18)
    // =========================================================================
    const tIce = this._getTileCoords(18);
    fillNoise(tIce.x, tIce.y, 168, 220, 250, 2.2, 18);
    // Crystal fissures & gleams
    rect(tIce.x, tIce.y, 2, 3, 4, 1, '#ffffff');
    rect(tIce.x, tIce.y, 5, 4, 3, 1, '#ffffff');
    rect(tIce.x, tIce.y, 8, 10, 5, 1, '#ffffff');
    rect(tIce.x, tIce.y, 6, 5, 2, 4, '#8ec8e8');
    px(tIce.x, tIce.y, 3, 2, '#ffffff');
    px(tIce.x, tIce.y, 12, 11, '#ffffff');

    // =========================================================================
    // 19. CACTUS TOP (Index 19)
    // =========================================================================
    const tCactTop = this._getTileCoords(19);
    rect(tCactTop.x, tCactTop.y, 0, 0, 16, 16, '#2d6b24');
    rect(tCactTop.x, tCactTop.y, 2, 2, 12, 12, '#21521a');
    rect(tCactTop.x, tCactTop.y, 5, 5, 6, 6, '#4caf38');
    px(tCactTop.x, tCactTop.y, 7, 7, '#183d13');
    px(tCactTop.x, tCactTop.y, 8, 7, '#183d13');
    px(tCactTop.x, tCactTop.y, 7, 8, '#183d13');
    px(tCactTop.x, tCactTop.y, 8, 8, '#183d13');

    // =========================================================================
    // 20. CACTUS SIDE (Index 20)
    // =========================================================================
    const tCactSide = this._getTileCoords(20);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const stripe = Math.sin(x * 1.57) * 24;
        px(tCactSide.x, tCactSide.y, x, y, `rgb(${(52 + stripe * 0.5)|0}, ${(126 + stripe)|0}, ${(46 + stripe * 0.4)|0})`);
      }
    }
    // Sharp golden thorns
    rect(tCactSide.x, tCactSide.y, 3, 3, 2, 1, '#fae66e');
    rect(tCactSide.x, tCactSide.y, 10, 6, 2, 1, '#fae66e');
    rect(tCactSide.x, tCactSide.y, 4, 11, 2, 1, '#fae66e');
    rect(tCactSide.x, tCactSide.y, 11, 13, 2, 1, '#fae66e');

    // =========================================================================
    // 21. FLOWER RED (Index 21)
    // =========================================================================
    const tFlRed = this._getTileCoords(21);
    ctx.clearRect(tFlRed.x, tFlRed.y, s, s);
    rect(tFlRed.x, tFlRed.y, 7, 7, 2, 9, '#2e7d32');
    rect(tFlRed.x, tFlRed.y, 5, 11, 2, 2, '#388e3c');
    rect(tFlRed.x, tFlRed.y, 9, 10, 2, 2, '#388e3c');
    rect(tFlRed.x, tFlRed.y, 5, 2, 6, 6, '#c62828');
    rect(tFlRed.x, tFlRed.y, 4, 3, 8, 4, '#e53935');
    rect(tFlRed.x, tFlRed.y, 6, 3, 4, 2, '#ff8a80');
    rect(tFlRed.x, tFlRed.y, 7, 4, 2, 2, '#fbc02d');

    // =========================================================================
    // 22. FLOWER YELLOW (Index 22)
    // =========================================================================
    const tFlYel = this._getTileCoords(22);
    ctx.clearRect(tFlYel.x, tFlYel.y, s, s);
    rect(tFlYel.x, tFlYel.y, 7, 6, 2, 10, '#2e7d32');
    rect(tFlYel.x, tFlYel.y, 4, 10, 3, 2, '#388e3c');
    rect(tFlYel.x, tFlYel.y, 5, 2, 6, 6, '#f57f17');
    rect(tFlYel.x, tFlYel.y, 4, 3, 8, 4, '#fbc02d');
    rect(tFlYel.x, tFlYel.y, 6, 3, 4, 2, '#fff59d');
    rect(tFlYel.x, tFlYel.y, 7, 4, 2, 2, '#e65100');

    // =========================================================================
    // 23. GRASS PLANT (Index 23)
    // =========================================================================
    const tGp = this._getTileCoords(23);
    ctx.clearRect(tGp.x, tGp.y, s, s);
    rect(tGp.x, tGp.y, 3, 5, 2, 11, '#388e3c');
    rect(tGp.x, tGp.y, 7, 2, 2, 14, '#388e3c');
    rect(tGp.x, tGp.y, 11, 4, 2, 12, '#388e3c');
    rect(tGp.x, tGp.y, 2, 7, 2, 8, '#4caf50');
    rect(tGp.x, tGp.y, 8, 3, 1, 10, '#4caf50');
    rect(tGp.x, tGp.y, 12, 6, 2, 7, '#4caf50');
    px(tGp.x, tGp.y, 7, 2, '#7ce648');
    px(tGp.x, tGp.y, 11, 4, '#7ce648');

    // =========================================================================
    // 24. MUSHROOM RED (Index 24)
    // =========================================================================
    const tMush = this._getTileCoords(24);
    ctx.clearRect(tMush.x, tMush.y, s, s);
    rect(tMush.x, tMush.y, 6, 8, 4, 8, '#d7ccc8');
    rect(tMush.x, tMush.y, 6, 14, 4, 2, '#bcaaa4');
    rect(tMush.x, tMush.y, 3, 3, 10, 6, '#b71c1c');
    rect(tMush.x, tMush.y, 2, 4, 12, 4, '#d32f2f');
    rect(tMush.x, tMush.y, 4, 4, 2, 2, '#ffffff');
    rect(tMush.x, tMush.y, 9, 4, 2, 2, '#ffffff');
    rect(tMush.x, tMush.y, 6, 6, 2, 1, '#ffffff');

    // =========================================================================
    // 25. MUSHROOM BROWN (Index 25)
    // =========================================================================
    const tMushBr = this._getTileCoords(25);
    ctx.clearRect(tMushBr.x, tMushBr.y, s, s);
    rect(tMushBr.x, tMushBr.y, 6, 8, 4, 8, '#d7ccc8');
    rect(tMushBr.x, tMushBr.y, 3, 3, 10, 6, '#6d4c41');
    rect(tMushBr.x, tMushBr.y, 2, 4, 12, 4, '#8d6e63');
    rect(tMushBr.x, tMushBr.y, 4, 4, 3, 2, '#a1887f');

    // =========================================================================
    // 26. COAL ORE (Index 26)
    // =========================================================================
    drawOreVeins(this._getTileCoords(26), ['#141417', '#25252d', '#363640'], '#555566', '#09090c');

    // =========================================================================
    // 27. IRON ORE (Index 27)
    // =========================================================================
    drawOreVeins(this._getTileCoords(27), ['#c47948', '#e8a174', '#995830'], '#fce2d0', '#633418');

    // =========================================================================
    // 28. GOLD ORE (Index 28)
    // =========================================================================
    drawOreVeins(this._getTileCoords(28), ['#f39c12', '#f1c40f', '#b87704'], '#fff9a6', '#704702');

    // =========================================================================
    // 29. CRYSTAL ORE (Diamond/Crystal) (Index 29)
    // =========================================================================
    drawOreVeins(this._getTileCoords(29), ['#00bcd4', '#26c6da', '#00838f'], '#e0f7fa', '#004d40');

    // =========================================================================
    // 30. BEDROCK (Index 30)
    // =========================================================================
    const tBedrock = this._getTileCoords(30);
    fillNoise(tBedrock.x, tBedrock.y, 42, 42, 50, 4.1, 28);
    rect(tBedrock.x, tBedrock.y, 2, 3, 4, 3, '#0d0d12');
    rect(tBedrock.x, tBedrock.y, 8, 7, 5, 4, '#0d0d12');
    rect(tBedrock.x, tBedrock.y, 3, 11, 4, 3, '#0d0d12');
    rect(tBedrock.x, tBedrock.y, 6, 2, 2, 2, '#626270');
    rect(tBedrock.x, tBedrock.y, 2, 8, 2, 1, '#626270');

    // =========================================================================
    // 31. WATER (Index 31)
    // =========================================================================
    const tWater = this._getTileCoords(31);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const wave = Math.sin(x * 1.2 + y * 1.6) * 16;
        const r = Math.min(255, Math.max(0, 32 + wave * 0.4));
        const g = Math.min(255, Math.max(0, 112 + wave * 0.8));
        const b = Math.min(255, Math.max(0, 220 + wave));
        px(tWater.x, tWater.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
      }
    }
    rect(tWater.x, tWater.y, 2, 3, 5, 1, '#85d8ff');
    rect(tWater.x, tWater.y, 9, 7, 5, 1, '#85d8ff');
    rect(tWater.x, tWater.y, 4, 12, 4, 1, '#85d8ff');

    // =========================================================================
    // 32. GLASS (Index 32)
    // =========================================================================
    const tGlass = this._getTileCoords(32);
    ctx.clearRect(tGlass.x, tGlass.y, s, s);
    rect(tGlass.x, tGlass.y, 1, 1, 14, 14, 'rgba(215, 238, 255, 0.4)');
    rect(tGlass.x, tGlass.y, 0, 0, 16, 1, '#e2f2ff');
    rect(tGlass.x, tGlass.y, 0, 15, 16, 1, '#e2f2ff');
    rect(tGlass.x, tGlass.y, 0, 0, 1, 16, '#e2f2ff');
    rect(tGlass.x, tGlass.y, 15, 0, 1, 16, '#e2f2ff');
    // Crisp diagonal glare streaks
    rect(tGlass.x, tGlass.y, 3, 3, 2, 2, 'rgba(255, 255, 255, 0.9)');
    rect(tGlass.x, tGlass.y, 5, 5, 3, 1, 'rgba(255, 255, 255, 0.9)');
    rect(tGlass.x, tGlass.y, 10, 10, 3, 2, 'rgba(255, 255, 255, 0.9)');

    // =========================================================================
    // 33. BRICK (Index 33)
    // =========================================================================
    const tBrick = this._getTileCoords(33);
    fillNoise(tBrick.x, tBrick.y, 172, 74, 56, 2.1, 14);
    rect(tBrick.x, tBrick.y, 0, 3, 16, 1, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 0, 7, 16, 1, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 0, 11, 16, 1, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 0, 15, 16, 1, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 8, 0, 1, 4, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 4, 4, 1, 4, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 12, 8, 1, 4, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 6, 12, 1, 4, '#d8d4cd');
    rect(tBrick.x, tBrick.y, 0, 0, 8, 1, '#f28c77');
    rect(tBrick.x, tBrick.y, 0, 4, 4, 1, '#f28c77');
    rect(tBrick.x, tBrick.y, 5, 4, 7, 1, '#f28c77');

    // =========================================================================
    // 34. CRAFTING BENCH TOP (Index 34)
    // =========================================================================
    const tBenchTop = this._getTileCoords(34);
    rect(tBenchTop.x, tBenchTop.y, 0, 0, 16, 16, '#a16d3f');
    rect(tBenchTop.x, tBenchTop.y, 0, 0, 16, 1, '#59361a');
    rect(tBenchTop.x, tBenchTop.y, 0, 15, 16, 1, '#59361a');
    rect(tBenchTop.x, tBenchTop.y, 0, 0, 1, 16, '#59361a');
    rect(tBenchTop.x, tBenchTop.y, 15, 0, 1, 16, '#59361a');
    // 3x3 blueprint carving
    rect(tBenchTop.x, tBenchTop.y, 3, 3, 4, 4, '#482710');
    rect(tBenchTop.x, tBenchTop.y, 9, 3, 4, 4, '#482710');
    rect(tBenchTop.x, tBenchTop.y, 3, 9, 4, 4, '#482710');
    rect(tBenchTop.x, tBenchTop.y, 9, 9, 4, 4, '#482710');
    // Brass corner studs
    rect(tBenchTop.x, tBenchTop.y, 1, 1, 2, 2, '#f1c40f');
    rect(tBenchTop.x, tBenchTop.y, 13, 1, 2, 2, '#f1c40f');
    rect(tBenchTop.x, tBenchTop.y, 1, 13, 2, 2, '#f1c40f');
    rect(tBenchTop.x, tBenchTop.y, 13, 13, 2, 2, '#f1c40f');

    // =========================================================================
    // 35. CRAFTING BENCH SIDE (Index 35)
    // =========================================================================
    const tBenchSide = this._getTileCoords(35);
    rect(tBenchSide.x, tBenchSide.y, 0, 0, 16, 16, '#8a5930');
    rect(tBenchSide.x, tBenchSide.y, 0, 5, 16, 1, '#59361a');
    rect(tBenchSide.x, tBenchSide.y, 0, 11, 16, 1, '#59361a');
    // Saw & Hammer tools
    rect(tBenchSide.x, tBenchSide.y, 3, 7, 3, 7, '#26262b');
    rect(tBenchSide.x, tBenchSide.y, 2, 7, 5, 2, '#b0b3ba');
    rect(tBenchSide.x, tBenchSide.y, 10, 7, 2, 6, '#b0b3ba');
    rect(tBenchSide.x, tBenchSide.y, 9, 7, 4, 2, '#482710');

    // =========================================================================
    // 36. SMELTER FRONT (Index 36)
    // =========================================================================
    const tSmelterFront = this._getTileCoords(36);
    rect(tSmelterFront.x, tSmelterFront.y, 0, 0, 16, 16, '#55585d');
    rect(tSmelterFront.x, tSmelterFront.y, 0, 0, 16, 1, '#333538');
    rect(tSmelterFront.x, tSmelterFront.y, 0, 15, 16, 1, '#333538');
    rect(tSmelterFront.x, tSmelterFront.y, 0, 0, 1, 16, '#333538');
    rect(tSmelterFront.x, tSmelterFront.y, 15, 0, 1, 16, '#333538');
    // Dark kiln mouth & iron grate
    rect(tSmelterFront.x, tSmelterFront.y, 3, 6, 10, 8, '#1a1b1d');
    rect(tSmelterFront.x, tSmelterFront.y, 4, 4, 8, 2, '#1a1b1d');
    rect(tSmelterFront.x, tSmelterFront.y, 5, 6, 2, 8, '#7f8c8d');
    rect(tSmelterFront.x, tSmelterFront.y, 9, 6, 2, 8, '#7f8c8d');
    rect(tSmelterFront.x, tSmelterFront.y, 3, 9, 10, 1, '#7f8c8d');

    // =========================================================================
    // 37. SMELTER FRONT ACTIVE (Index 37)
    // =========================================================================
    const tSmelterActive = this._getTileCoords(37);
    rect(tSmelterActive.x, tSmelterActive.y, 0, 0, 16, 16, '#55585d');
    rect(tSmelterActive.x, tSmelterActive.y, 0, 0, 16, 1, '#333538');
    rect(tSmelterActive.x, tSmelterActive.y, 0, 15, 16, 1, '#333538');
    rect(tSmelterActive.x, tSmelterActive.y, 0, 0, 1, 16, '#333538');
    rect(tSmelterActive.x, tSmelterActive.y, 15, 0, 1, 16, '#333538');
    // Roaring furnace flame
    rect(tSmelterActive.x, tSmelterActive.y, 3, 6, 10, 8, '#e67e22');
    rect(tSmelterActive.x, tSmelterActive.y, 4, 4, 8, 2, '#e67e22');
    rect(tSmelterActive.x, tSmelterActive.y, 5, 7, 6, 5, '#f1c40f');
    rect(tSmelterActive.x, tSmelterActive.y, 6, 9, 4, 3, '#ffffff');

    // =========================================================================
    // 38. SMELTER SIDE (Index 38)
    // =========================================================================
    const tSmelterSide = this._getTileCoords(38);
    rect(tSmelterSide.x, tSmelterSide.y, 0, 0, 16, 16, '#585b61');
    rect(tSmelterSide.x, tSmelterSide.y, 0, 3, 16, 2, '#333538');
    rect(tSmelterSide.x, tSmelterSide.y, 0, 11, 16, 2, '#333538');
    rect(tSmelterSide.x, tSmelterSide.y, 2, 3, 2, 2, '#8f939c');
    rect(tSmelterSide.x, tSmelterSide.y, 12, 3, 2, 2, '#8f939c');
    rect(tSmelterSide.x, tSmelterSide.y, 2, 11, 2, 2, '#8f939c');
    rect(tSmelterSide.x, tSmelterSide.y, 12, 11, 2, 2, '#8f939c');

    // =========================================================================
    // 39. SMELTER TOP (Index 39)
    // =========================================================================
    const tSmelterTop = this._getTileCoords(39);
    rect(tSmelterTop.x, tSmelterTop.y, 0, 0, 16, 16, '#4c4f54');
    rect(tSmelterTop.x, tSmelterTop.y, 5, 5, 6, 6, '#1a1b1d');
    rect(tSmelterTop.x, tSmelterTop.y, 7, 5, 2, 6, '#7f8c8d');
    rect(tSmelterTop.x, tSmelterTop.y, 5, 7, 6, 2, '#7f8c8d');

    // =========================================================================
    // 40. CHEST TOP (Index 40)
    // =========================================================================
    const tChestTop = this._getTileCoords(40);
    rect(tChestTop.x, tChestTop.y, 0, 0, 16, 16, '#9e6439');
    rect(tChestTop.x, tChestTop.y, 1, 1, 14, 14, '#5a361c');
    rect(tChestTop.x, tChestTop.y, 2, 2, 12, 12, '#9e6439');
    rect(tChestTop.x, tChestTop.y, 1, 1, 2, 2, '#f1c40f');
    rect(tChestTop.x, tChestTop.y, 13, 1, 2, 2, '#f1c40f');
    rect(tChestTop.x, tChestTop.y, 1, 13, 2, 2, '#f1c40f');
    rect(tChestTop.x, tChestTop.y, 13, 13, 2, 2, '#f1c40f');

    // =========================================================================
    // 41. CHEST FRONT (Index 41)
    // =========================================================================
    const tChestFront = this._getTileCoords(41);
    rect(tChestFront.x, tChestFront.y, 0, 0, 16, 16, '#9e6439');
    rect(tChestFront.x, tChestFront.y, 0, 5, 16, 1, '#4e2d14');
    rect(tChestFront.x, tChestFront.y, 6, 4, 4, 5, '#f1c40f');
    rect(tChestFront.x, tChestFront.y, 7, 6, 2, 2, '#1c1d1f');
    rect(tChestFront.x, tChestFront.y, 0, 0, 2, 16, '#7f8c8d');
    rect(tChestFront.x, tChestFront.y, 14, 0, 2, 16, '#7f8c8d');

    // =========================================================================
    // 42. CHEST SIDE (Index 42)
    // =========================================================================
    const tChestSide = this._getTileCoords(42);
    rect(tChestSide.x, tChestSide.y, 0, 0, 16, 16, '#9e6439');
    rect(tChestSide.x, tChestSide.y, 0, 5, 16, 1, '#4e2d14');
    rect(tChestSide.x, tChestSide.y, 0, 0, 2, 16, '#7f8c8d');
    rect(tChestSide.x, tChestSide.y, 14, 0, 2, 16, '#7f8c8d');

    // =========================================================================
    // 43. TILLED SOIL TOP (Index 43)
    // =========================================================================
    const tTilledTop = this._getTileCoords(43);
    rect(tTilledTop.x, tTilledTop.y, 0, 0, 16, 16, '#5c3a21');
    for (let y = 1; y < s; y += 4) {
      rect(tTilledTop.x, tTilledTop.y, 0, y, 16, 2, '#3e2411');
      rect(tTilledTop.x, tTilledTop.y, 0, y + 2, 16, 1, '#7a4f2d');
    }

    // =========================================================================
    // 44. TILLED SOIL SIDE (Index 44)
    // =========================================================================
    const tTilledSide = this._getTileCoords(44);
    rect(tTilledSide.x, tTilledSide.y, 0, 0, 16, 16, '#866043');
    rect(tTilledSide.x, tTilledSide.y, 0, 0, 16, 3, '#3e2411');

    // =========================================================================
    // 45, 46, 47. CROP WHEAT (Indices 45, 46, 47)
    // =========================================================================
    const cw1 = this._getTileCoords(45);
    ctx.clearRect(cw1.x, cw1.y, s, s);
    rect(cw1.x, cw1.y, 3, 12, 2, 4, '#27ae60');
    rect(cw1.x, cw1.y, 8, 11, 2, 5, '#27ae60');
    rect(cw1.x, cw1.y, 13, 13, 2, 3, '#27ae60');

    const cw2 = this._getTileCoords(46);
    ctx.clearRect(cw2.x, cw2.y, s, s);
    rect(cw2.x, cw2.y, 2, 7, 3, 9, '#2ecc71');
    rect(cw2.x, cw2.y, 7, 5, 3, 11, '#2ecc71');
    rect(cw2.x, cw2.y, 12, 8, 3, 8, '#2ecc71');

    const cw3 = this._getTileCoords(47);
    ctx.clearRect(cw3.x, cw3.y, s, s);
    rect(cw3.x, cw3.y, 2, 3, 4, 13, '#f39c12');
    rect(cw3.x, cw3.y, 7, 1, 4, 15, '#f39c12');
    rect(cw3.x, cw3.y, 11, 4, 4, 12, '#f39c12');
    rect(cw3.x, cw3.y, 2, 2, 4, 4, '#f1c40f');
    rect(cw3.x, cw3.y, 7, 0, 4, 5, '#f1c40f');
    rect(cw3.x, cw3.y, 11, 3, 4, 4, '#f1c40f');

    // =========================================================================
    // 48, 49, 50. CROP BERRY (Indices 48, 49, 50)
    // =========================================================================
    const cb1 = this._getTileCoords(48);
    ctx.clearRect(cb1.x, cb1.y, s, s);
    rect(cb1.x, cb1.y, 5, 10, 6, 6, '#27ae60');

    const cb2 = this._getTileCoords(49);
    ctx.clearRect(cb2.x, cb2.y, s, s);
    rect(cb2.x, cb2.y, 3, 6, 10, 10, '#2ecc71');
    rect(cb2.x, cb2.y, 4, 8, 2, 2, '#e91e63');
    rect(cb2.x, cb2.y, 10, 11, 2, 2, '#e91e63');

    const cb3 = this._getTileCoords(50);
    ctx.clearRect(cb3.x, cb3.y, s, s);
    rect(cb3.x, cb3.y, 2, 3, 12, 13, '#27ae60');
    rect(cb3.x, cb3.y, 3, 5, 3, 3, '#8e44ad');
    rect(cb3.x, cb3.y, 9, 4, 3, 3, '#8e44ad');
    rect(cb3.x, cb3.y, 5, 10, 3, 3, '#8e44ad');
    rect(cb3.x, cb3.y, 11, 9, 3, 3, '#8e44ad');

    // =========================================================================
    // 51, 52, 53. CROP ROOT (Indices 51, 52, 53)
    // =========================================================================
    const cr1 = this._getTileCoords(51);
    ctx.clearRect(cr1.x, cr1.y, s, s);
    rect(cr1.x, cr1.y, 6, 12, 4, 4, '#2ecc71');

    const cr2 = this._getTileCoords(52);
    ctx.clearRect(cr2.x, cr2.y, s, s);
    rect(cr2.x, cr2.y, 4, 7, 8, 9, '#27ae60');
    rect(cr2.x, cr2.y, 6, 13, 4, 3, '#e67e22');

    const cr3 = this._getTileCoords(53);
    ctx.clearRect(cr3.x, cr3.y, s, s);
    rect(cr3.x, cr3.y, 3, 2, 10, 7, '#2ecc71');
    rect(cr3.x, cr3.y, 5, 8, 6, 8, '#e67e22');
    rect(cr3.x, cr3.y, 6, 10, 4, 6, '#d35400');

    // =========================================================================
    // 54. TORCH (Index 54)
    // =========================================================================
    const tTorch = this._getTileCoords(54);
    ctx.clearRect(tTorch.x, tTorch.y, s, s);
    rect(tTorch.x, tTorch.y, 7, 6, 2, 10, '#8b5a2b');
    rect(tTorch.x, tTorch.y, 6, 3, 4, 4, '#e67e22');
    rect(tTorch.x, tTorch.y, 7, 2, 2, 3, '#f1c40f');
    rect(tTorch.x, tTorch.y, 7, 3, 2, 1, '#ffffff');

    // =========================================================================
    // 55. OBSIDIAN (Index 55)
    // =========================================================================
    const tObsidian = this._getTileCoords(55);
    fillNoise(tObsidian.x, tObsidian.y, 22, 14, 38, 3.5, 20);
    rect(tObsidian.x, tObsidian.y, 3, 4, 3, 3, '#581c87');
    rect(tObsidian.x, tObsidian.y, 9, 8, 4, 3, '#581c87');
    px(tObsidian.x, tObsidian.y, 4, 5, '#a855f7');
    px(tObsidian.x, tObsidian.y, 10, 9, '#a855f7');

    // =========================================================================
    // 56. COPPER ORE (Index 56)
    // =========================================================================
    drawOreVeins(this._getTileCoords(56), ['#ea580c', '#0d9488', '#c2410c'], '#5eead4', '#7c2d12');

    // =========================================================================
    // 57. REDSTONE ORE (Index 57)
    // =========================================================================
    drawOreVeins(this._getTileCoords(57), ['#dc2626', '#ef4444', '#b91c1c'], '#fca5a5', '#450a0a');

    // =========================================================================
    // 58. LAPIS ORE (Index 58)
    // =========================================================================
    drawOreVeins(this._getTileCoords(58), ['#1d4ed8', '#2563eb', '#1e3a8a'], '#93c5fd', '#172554');

    // =========================================================================
    // 59. EMERALD ORE (Index 59)
    // =========================================================================
    drawOreVeins(this._getTileCoords(59), ['#059669', '#10b981', '#047857'], '#6ee7b7', '#064e3b');

    // =========================================================================
    // 60. CLAY (Index 60)
    // =========================================================================
    const tClay = this._getTileCoords(60);
    fillNoise(tClay.x, tClay.y, 160, 105, 90, 2.0, 12);
    rect(tClay.x, tClay.y, 2, 2, 4, 2, '#caa090');
    rect(tClay.x, tClay.y, 9, 7, 4, 2, '#caa090');
    rect(tClay.x, tClay.y, 4, 11, 4, 2, '#8a5545');

    // =========================================================================
    // 61. GRAVEL (Index 61)
    // =========================================================================
    const tGravel = this._getTileCoords(61);
    fillNoise(tGravel.x, tGravel.y, 120, 118, 115, 3.8, 22);
    rect(tGravel.x, tGravel.y, 3, 2, 3, 2, '#57534e');
    rect(tGravel.x, tGravel.y, 9, 6, 3, 2, '#d6d3d1');
    rect(tGravel.x, tGravel.y, 2, 10, 4, 2, '#78716c');

    // =========================================================================
    // 62. BOOKSHELF (Index 62)
    // =========================================================================
    const tBookshelf = this._getTileCoords(62);
    const tPlanks = this._getTileCoords(10);
    ctx.drawImage(this.canvas, tPlanks.x, tPlanks.y, s, s, tBookshelf.x, tBookshelf.y, s, s);
    rect(tBookshelf.x, tBookshelf.y, 2, 2, 12, 5, '#1e1108');
    rect(tBookshelf.x, tBookshelf.y, 2, 9, 12, 5, '#1e1108');
    // Top shelf books
    rect(tBookshelf.x, tBookshelf.y, 3, 3, 2, 4, '#dc2626');
    rect(tBookshelf.x, tBookshelf.y, 5, 2, 2, 5, '#2563eb');
    rect(tBookshelf.x, tBookshelf.y, 7, 3, 2, 4, '#16a34a');
    rect(tBookshelf.x, tBookshelf.y, 9, 2, 3, 5, '#d97706');
    rect(tBookshelf.x, tBookshelf.y, 12, 3, 2, 4, '#8b5cf6');
    // Bottom shelf books
    rect(tBookshelf.x, tBookshelf.y, 3, 9, 3, 5, '#059669');
    rect(tBookshelf.x, tBookshelf.y, 6, 10, 2, 4, '#ea580c');
    rect(tBookshelf.x, tBookshelf.y, 8, 9, 3, 5, '#2563eb');
    rect(tBookshelf.x, tBookshelf.y, 11, 10, 3, 4, '#dc2626');

    // =========================================================================
    // 63. MOSSY COBBLESTONE (Index 63)
    // =========================================================================
    const tMossyCobble = this._getTileCoords(63);
    ctx.drawImage(this.canvas, tCobble.x, tCobble.y, s, s, tMossyCobble.x, tMossyCobble.y, s, s);
    rect(tMossyCobble.x, tMossyCobble.y, 3, 3, 4, 3, '#3d5e2c');
    rect(tMossyCobble.x, tMossyCobble.y, 9, 8, 5, 4, '#55823e');
    rect(tMossyCobble.x, tMossyCobble.y, 2, 11, 3, 3, '#3d5e2c');
    px(tMossyCobble.x, tMossyCobble.y, 4, 4, '#72ab53');
    px(tMossyCobble.x, tMossyCobble.y, 10, 9, '#72ab53');

    // =========================================================================
    // 64. NETHERRACK (Index 64)
    // =========================================================================
    const tNetherrack = this._getTileCoords(64);
    fillNoise(tNetherrack.x, tNetherrack.y, 115, 30, 30, 3.4, 25);
    rect(tNetherrack.x, tNetherrack.y, 3, 3, 4, 3, '#380a0a');
    rect(tNetherrack.x, tNetherrack.y, 9, 8, 4, 4, '#380a0a');
    rect(tNetherrack.x, tNetherrack.y, 4, 10, 3, 3, '#942525');

    // =========================================================================
    // 65. END STONE (Index 65)
    // =========================================================================
    const tEndStone = this._getTileCoords(65);
    fillNoise(tEndStone.x, tEndStone.y, 210, 205, 160, 2.8, 18);
    rect(tEndStone.x, tEndStone.y, 2, 4, 3, 2, '#969168');
    rect(tEndStone.x, tEndStone.y, 8, 7, 4, 3, '#969168');
    rect(tEndStone.x, tEndStone.y, 3, 11, 3, 2, '#ece8be');

    // =========================================================================
    // 66. VINES (Index 66)
    // =========================================================================
    const tVines = this._getTileCoords(66);
    ctx.clearRect(tVines.x, tVines.y, s, s);
    rect(tVines.x, tVines.y, 2, 0, 2, 16, '#2e7d32');
    rect(tVines.x, tVines.y, 8, 0, 2, 16, '#2e7d32');
    rect(tVines.x, tVines.y, 13, 0, 2, 12, '#2e7d32');
    rect(tVines.x, tVines.y, 1, 3, 4, 3, '#4caf50');
    rect(tVines.x, tVines.y, 7, 7, 4, 4, '#4caf50');
    rect(tVines.x, tVines.y, 12, 4, 3, 3, '#4caf50');

    // =========================================================================
    // 67. TALL GRASS (Index 67)
    // =========================================================================
    const tTallGrass = this._getTileCoords(67);
    ctx.clearRect(tTallGrass.x, tTallGrass.y, s, s);
    rect(tTallGrass.x, tTallGrass.y, 3, 2, 2, 14, '#388e3c');
    rect(tTallGrass.x, tTallGrass.y, 7, 0, 2, 16, '#388e3c');
    rect(tTallGrass.x, tTallGrass.y, 11, 3, 2, 13, '#388e3c');
    rect(tTallGrass.x, tTallGrass.y, 6, 2, 4, 4, '#4caf50');
    rect(tTallGrass.x, tTallGrass.y, 2, 6, 4, 4, '#4caf50');

    // =========================================================================
    // 68. LAVA (Index 68)
    // =========================================================================
    const tLava = this._getTileCoords(68);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const swirl = Math.sin(x * 1.1 + y * 1.4) * 20;
        const r = Math.min(255, Math.max(180, 230 + swirl));
        const g = Math.min(255, Math.max(40, 90 + swirl * 2.2));
        const b = 10;
        px(tLava.x, tLava.y, x, y, `rgb(${r|0}, ${g|0}, ${b|0})`);
      }
    }
    rect(tLava.x, tLava.y, 3, 3, 4, 2, '#fde047');
    rect(tLava.x, tLava.y, 9, 8, 5, 2, '#fde047');
    px(tLava.x, tLava.y, 5, 4, '#ffffff');
    px(tLava.x, tLava.y, 11, 9, '#ffffff');

    // =========================================================================
    // 69. DEEPSLATE TOP (Index 69)
    // =========================================================================
    const tDsTop = this._getTileCoords(69);
    fillNoise(tDsTop.x, tDsTop.y, 48, 48, 56, 3.2, 14);
    rect(tDsTop.x, tDsTop.y, 3, 3, 4, 2, '#23232b');
    rect(tDsTop.x, tDsTop.y, 9, 8, 4, 3, '#23232b');
    rect(tDsTop.x, tDsTop.y, 4, 11, 3, 2, '#484854');

    // =========================================================================
    // 70. DEEPSLATE SIDE (Index 70)
    // =========================================================================
    const tDsSide = this._getTileCoords(70);
    fillNoise(tDsSide.x, tDsSide.y, 45, 45, 52, 2.8, 14);
    rect(tDsSide.x, tDsSide.y, 0, 3, 16, 2, '#202028');
    rect(tDsSide.x, tDsSide.y, 0, 8, 16, 2, '#202028');
    rect(tDsSide.x, tDsSide.y, 0, 13, 16, 2, '#202028');

    // Helper to draw deepslate ore veins
    const drawDeepslateOre = (tCoords, gemColors, highlightColor, darkOutlineColor) => {
      ctx.drawImage(this.canvas, tDsSide.x, tDsSide.y, s, s, tCoords.x, tCoords.y, s, s);
      const outlines = [[3, 2, 4, 5], [9, 3, 5, 4], [2, 9, 5, 5], [9, 10, 5, 4]];
      outlines.forEach(([ox, oy, ow, oh]) => {
        rect(tCoords.x, tCoords.y, ox, oy, ow, oh, darkOutlineColor);
      });
      rect(tCoords.x, tCoords.y, 4, 3, 2, 3, gemColors[0]);
      rect(tCoords.x, tCoords.y, 5, 4, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 4, 3, highlightColor);
      if (gemColors[2]) px(tCoords.x, tCoords.y, 5, 5, gemColors[2]);
      rect(tCoords.x, tCoords.y, 10, 4, 3, 2, gemColors[0]);
      rect(tCoords.x, tCoords.y, 11, 5, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 10, 4, highlightColor);
      rect(tCoords.x, tCoords.y, 3, 10, 3, 3, gemColors[0]);
      rect(tCoords.x, tCoords.y, 4, 11, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 3, 10, highlightColor);
      rect(tCoords.x, tCoords.y, 10, 11, 3, 2, gemColors[0]);
      rect(tCoords.x, tCoords.y, 11, 12, 2, 2, gemColors[1]);
      px(tCoords.x, tCoords.y, 10, 11, highlightColor);
    };

    drawDeepslateOre(this._getTileCoords(71), ['#141417', '#25252d', '#363640'], '#555566', '#09090c'); // coal
    drawDeepslateOre(this._getTileCoords(72), ['#c47948', '#e8a174', '#995830'], '#fce2d0', '#1c1c24'); // iron
    drawDeepslateOre(this._getTileCoords(73), ['#f39c12', '#f1c40f', '#b87704'], '#fff9a6', '#1c1c24'); // gold
    drawDeepslateOre(this._getTileCoords(74), ['#00bcd4', '#26c6da', '#00838f'], '#e0f7fa', '#004d40'); // crystal/diamond
    drawDeepslateOre(this._getTileCoords(75), ['#ea580c', '#0d9488', '#c2410c'], '#5eead4', '#1c1c24'); // copper
    drawDeepslateOre(this._getTileCoords(76), ['#dc2626', '#ef4444', '#b91c1c'], '#fca5a5', '#1c1c24'); // redstone
    drawDeepslateOre(this._getTileCoords(77), ['#1d4ed8', '#2563eb', '#1e3a8a'], '#93c5fd', '#1c1c24'); // lapis
    drawDeepslateOre(this._getTileCoords(78), ['#059669', '#10b981', '#047857'], '#6ee7b7', '#064e3b'); // emerald

    // =========================================================================
    // 79. GRANITE (Index 79)
    // =========================================================================
    const tGranite = this._getTileCoords(79);
    fillNoise(tGranite.x, tGranite.y, 150, 105, 90, 2.5, 18);
    rect(tGranite.x, tGranite.y, 3, 2, 4, 3, '#c2816f');
    rect(tGranite.x, tGranite.y, 9, 8, 4, 2, '#854e40');
    rect(tGranite.x, tGranite.y, 4, 11, 3, 2, '#caa090');

    // =========================================================================
    // 80. DIORITE (Index 80)
    // =========================================================================
    const tDiorite = this._getTileCoords(80);
    fillNoise(tDiorite.x, tDiorite.y, 185, 185, 190, 3.2, 24);
    rect(tDiorite.x, tDiorite.y, 2, 4, 3, 3, '#62626a');
    rect(tDiorite.x, tDiorite.y, 8, 7, 4, 3, '#ffffff');
    rect(tDiorite.x, tDiorite.y, 12, 11, 3, 2, '#62626a');

    // =========================================================================
    // 81. ANDESITE (Index 81)
    // =========================================================================
    const tAndesite = this._getTileCoords(81);
    fillNoise(tAndesite.x, tAndesite.y, 130, 132, 136, 2.7, 14);
    rect(tAndesite.x, tAndesite.y, 3, 3, 4, 2, '#666870');
    rect(tAndesite.x, tAndesite.y, 9, 7, 3, 3, '#9fa3b0');

    // =========================================================================
    // 82. TUFF (Index 82)
    // =========================================================================
    const tTuff = this._getTileCoords(82);
    fillNoise(tTuff.x, tTuff.y, 65, 68, 62, 3.0, 16);
    rect(tTuff.x, tTuff.y, 2, 3, 3, 3, '#383b35');
    rect(tTuff.x, tTuff.y, 8, 8, 4, 2, '#484d44');
    rect(tTuff.x, tTuff.y, 4, 11, 3, 2, '#858d7e');

    // =========================================================================
    // MINICRAFT V7.3: APPLY IMPORTED CUSTOM TEXTURE PIXELS
    // =========================================================================
    if (typeof RAW_CUSTOM_PIXELS !== 'undefined' && RAW_CUSTOM_PIXELS) {
      for (const [tileName, pixelArray] of Object.entries(RAW_CUSTOM_PIXELS)) {
        const tileIdx = this.tileIndices[tileName];
        if (tileIdx !== undefined && pixelArray) {
          const coords = this._getTileCoords(tileIdx);
          try {
            const imgData = ctx.createImageData(s, s);
            imgData.data.set(pixelArray);
            ctx.putImageData(imgData, coords.x, coords.y);
          } catch (err) {
            // Fallback for environments where putImageData is mocked
            for (let py = 0; py < s; py++) {
              for (let pxCoord = 0; pxCoord < s; pxCoord++) {
                const idx = (py * s + pxCoord) * 4;
                const r = pixelArray[idx];
                const g = pixelArray[idx + 1];
                const b = pixelArray[idx + 2];
                const a = pixelArray[idx + 3] / 255;
                if (a > 0) {
                  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
                  ctx.fillRect(coords.x + pxCoord, coords.y + py, 1, 1);
                }
              }
            }
          }
        }
      }
    }
  }
}
