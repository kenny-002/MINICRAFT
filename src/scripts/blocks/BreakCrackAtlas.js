import * as THREE from 'three';

/**
 * BreakCrackAtlas generates 10 progressive pixel-art block breaking damage textures (16x16).
 * Based directly on the reference visual: crisp square pixels, jagged branching cracks,
 * dark charcoal-brown fracture lines (#1e1c17, #2b2720, #3d372c),
 * muted beige/tan highlight edges (#dfd4b2, #baa984, #8c8065),
 * and 100% transparent background for unobstructed view of the underlying block texture.
 */
export class BreakCrackAtlas {
  constructor() {
    this.stageTextures = [];
    this._generateStages();
  }

  getTexture(stageIndex) {
    const idx = Math.max(0, Math.min(9, Math.floor(stageIndex)));
    return this.stageTextures[idx] || this.stageTextures[0];
  }

  _generateStages() {
    // 16x16 Master Crack Pixel Map
    // 0 = Transparent
    // 1 = Dark Crack Core (#1c1a16)
    // 2 = Deep Charcoal (#2d2921)
    // 3 = Dark Brown Fissure (#3e372b)
    // 4 = Bright Beige Highlight (#dfd4b2)
    // 5 = Muted Tan Highlight (#c2b48e)
    // 6 = Dusty Gray-Olive Highlight (#8e8266)

    // Master damage map reflecting the exact jagged branching structure from the reference:
    // - Upper-left U-shaped fork (x: 1-4, y: 3-8)
    // - Top-right diagonal climbing branch (x: 7-15, y: 3-7)
    // - Central heavy junction (x: 5-8, y: 6-10)
    // - Lower-left hook fracture (x: 2-7, y: 11-15)
    // - Lower-right branch (x: 9-14, y: 9-14)
    const masterCrack = [
      // y = 0
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      // y = 1
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      // y = 2
      [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0],
      // y = 3
      [0, 1, 4, 0, 1, 4, 0, 0, 0, 0, 0, 0, 4, 1, 1, 4],
      // y = 4
      [0, 1, 0, 0, 1, 5, 0, 0, 0, 0, 4, 1, 1, 2, 5, 0],
      // y = 5
      [0, 1, 0, 0, 1, 0, 0, 0, 4, 1, 1, 5, 0, 0, 0, 0],
      // y = 6
      [0, 1, 1, 1, 2, 4, 0, 4, 1, 2, 5, 0, 0, 0, 0, 0],
      // y = 7
      [0, 4, 5, 5, 1, 1, 4, 1, 1, 5, 0, 0, 0, 0, 0, 0],
      // y = 8
      [4, 1, 5, 0, 4, 1, 1, 2, 4, 0, 0, 4, 1, 4, 0, 0],
      // y = 9
      [1, 2, 4, 0, 0, 5, 1, 1, 5, 0, 4, 1, 1, 2, 4, 0],
      // y = 10
      [5, 1, 1, 4, 0, 0, 4, 1, 1, 4, 1, 2, 5, 0, 0, 0],
      // y = 11
      [0, 4, 1, 1, 0, 0, 0, 1, 1, 1, 5, 0, 0, 0, 0, 0],
      // y = 12
      [0, 0, 4, 1, 1, 4, 0, 1, 1, 4, 0, 0, 4, 5, 0, 0],
      // y = 13
      [0, 0, 0, 4, 1, 1, 1, 2, 5, 0, 0, 5, 1, 2, 5, 0],
      // y = 14
      [0, 0, 0, 0, 4, 5, 5, 4, 0, 0, 0, 0, 4, 5, 0, 0],
      // y = 15
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    // Progressive stage activation thresholds (0 = earliest stage, 9 = final stage)
    // Determines which stage unlocks which pixel coordinates
    const stageThresholds = [
      // y = 0
      [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
      // y = 1
      [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
      // y = 2
      [9, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 6, 9, 9],
      // y = 3
      [9, 6, 7, 9, 5, 6, 9, 9, 9, 9, 9, 9, 5, 4, 4, 6],
      // y = 4
      [9, 5, 9, 9, 4, 5, 9, 9, 9, 9, 4, 3, 3, 4, 6, 9],
      // y = 5
      [9, 4, 9, 9, 3, 9, 9, 9, 3, 2, 2, 4, 9, 9, 9, 9],
      // y = 6
      [9, 4, 4, 3, 2, 4, 9, 2, 1, 1, 3, 9, 9, 9, 9, 9],
      // y = 7
      [9, 6, 5, 5, 2, 1, 2, 0, 0, 2, 9, 9, 9, 9, 9, 9],
      // y = 8
      [7, 5, 6, 9, 3, 1, 0, 0, 2, 9, 9, 6, 5, 7, 9, 9],
      // y = 9
      [6, 5, 6, 9, 9, 3, 1, 1, 3, 9, 5, 4, 4, 5, 7, 9],
      // y = 10
      [7, 5, 4, 5, 9, 9, 3, 1, 1, 3, 3, 4, 6, 9, 9, 9],
      // y = 11
      [9, 6, 4, 3, 9, 9, 9, 2, 1, 2, 4, 9, 9, 9, 9, 9],
      // y = 12
      [9, 9, 5, 3, 2, 4, 9, 3, 2, 4, 9, 9, 7, 8, 9, 9],
      // y = 13
      [9, 9, 9, 5, 3, 2, 2, 3, 5, 9, 9, 7, 6, 7, 8, 9],
      // y = 14
      [9, 9, 9, 9, 6, 5, 5, 6, 9, 9, 9, 9, 7, 8, 9, 9],
      // y = 15
      [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    ];

    const colorPalette = {
      0: [0, 0, 0, 0], // Transparent
      1: [28, 26, 22, 255], // Dark Crack Core
      2: [45, 41, 33, 255], // Deep Charcoal
      3: [62, 55, 43, 255], // Dark Brown
      4: [223, 212, 178, 240], // Bright Beige Highlight
      5: [194, 180, 142, 230], // Muted Tan Highlight
      6: [142, 130, 102, 220], // Dusty Olive-Gray
    };

    // Generate 10 progressive textures (Stages 0 to 9) using DataTexture / Canvas
    for (let stage = 0; stage < 10; stage++) {
      const data = new Uint8Array(16 * 16 * 4);

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const type = masterCrack[y][x];
          const threshold = stageThresholds[y][x];
          const pixelIndex = (y * 16 + x) * 4;

          if (type > 0 && stage >= threshold) {
            const col = colorPalette[type];
            if (stage < 4 && type >= 4) {
              data[pixelIndex] = col[0];
              data[pixelIndex + 1] = col[1];
              data[pixelIndex + 2] = col[2];
              data[pixelIndex + 3] = Math.floor(col[3] * 0.7);
            } else {
              data[pixelIndex] = col[0];
              data[pixelIndex + 1] = col[1];
              data[pixelIndex + 2] = col[2];
              data[pixelIndex + 3] = col[3];
            }
          } else {
            data[pixelIndex] = 0;
            data[pixelIndex + 1] = 0;
            data[pixelIndex + 2] = 0;
            data[pixelIndex + 3] = 0;
          }
        }
      }

      let texture;
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(16, 16);
        imgData.data.set(data);
        ctx.putImageData(imgData, 0, 0);

        texture = new THREE.CanvasTexture(canvas);
      } else {
        texture = new THREE.DataTexture(data, 16, 16, THREE.RGBAFormat);
      }

      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      this.stageTextures.push(texture);
    }
  }

  dispose() {
    for (const tex of this.stageTextures) {
      if (tex && typeof tex.dispose === 'function') {
        tex.dispose();
      }
    }
    this.stageTextures = [];
  }
}
