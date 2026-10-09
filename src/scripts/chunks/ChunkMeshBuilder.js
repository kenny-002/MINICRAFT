import * as THREE from 'three';
import { BLOCK, BLOCK_PROPERTIES } from '../blocks/BlockTypes.js';
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, CHUNK_MIN_Y } from './Chunk.js';

// Standard 6 Cube Faces with consistent CCW winding (outward-facing)
// Each quad has 4 corners ordered: [Bottom-Left, Bottom-Right, Top-Right, Top-Left]
// Mapping to UV coordinates: [(u0,v0), (u1,v0), (u1,v1), (u0,v1)]
const FACES = [
  {
    // TOP (+Y)
    name: 'top',
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
    ],
  },
  {
    // BOTTOM (-Y)
    name: 'bottom',
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
    ],
  },
  {
    // NORTH (-Z)
    name: 'north',
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]
    ],
  },
  {
    // SOUTH (+Z)
    name: 'south',
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
    ],
  },
  {
    // WEST (-X)
    name: 'west',
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]
    ],
  },
  {
    // EAST (+X)
    name: 'east',
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]
    ],
  },
];

/**
 * Builds optimized Three.js BufferGeometries for solid chunks and water volumes.
 */
export class ChunkMeshBuilder {
  constructor(textureAtlas) {
    this.textureAtlas = textureAtlas;
  }

  buildChunkMesh(chunk, world) {
    // Solid / Opaque / Cutout buffers
    const sPos = [];
    const sNorm = [];
    const sUv = [];
    const sCol = [];
    const sInd = [];
    let sVertCount = 0;

    // Water transparent buffers
    const wPos = [];
    const wNorm = [];
    const wUv = [];
    const wCol = [];
    const wInd = [];
    let wVertCount = 0;

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const blockId = chunk.getLocalBlock(lx, ly, lz);
          if (blockId === BLOCK.AIR) continue;

          const blockProps = BLOCK_PROPERTIES[blockId];
          if (!blockProps || !blockProps.textures) continue;

          const gx = chunk.originX + lx;
          const gy = CHUNK_MIN_Y + ly;
          const gz = chunk.originZ + lz;

          // 1. Plant Decorations (Crossed X-Quads)
          if (blockProps.isPlant) {
            const texName = blockProps.textures.top || 'flower_red';
            const { u0, v0, u1, v1 } = this.textureAtlas.getTileUV(texName);

            // Diagonal quad 1 (front and back)
            const d1Front = [
              [0.15, 0.0, 0.15], [0.85, 0.0, 0.85], [0.85, 1.0, 0.85], [0.15, 1.0, 0.15]
            ];
            const d1Back = [
              [0.85, 0.0, 0.85], [0.15, 0.0, 0.15], [0.15, 1.0, 0.15], [0.85, 1.0, 0.85]
            ];

            // Diagonal quad 2 (front and back)
            const d2Front = [
              [0.85, 0.0, 0.15], [0.15, 0.0, 0.85], [0.15, 1.0, 0.85], [0.85, 1.0, 0.15]
            ];
            const d2Back = [
              [0.15, 0.0, 0.85], [0.85, 0.0, 0.15], [0.85, 1.0, 0.15], [0.15, 1.0, 0.85]
            ];

            const addCrossQuad = (corners) => {
              for (let k = 0; k < 4; k++) {
                sPos.push(gx + corners[k][0], gy + corners[k][1], gz + corners[k][2]);
                sNorm.push(0, 1, 0);
                sCol.push(0.95, 0.95, 0.95);
              }
              // Quad vertices ordered: [Bottom-Left, Bottom-Right, Top-Right, Top-Left]
              sUv.push(u0, v0, u1, v0, u1, v1, u0, v1);
              sInd.push(sVertCount, sVertCount + 1, sVertCount + 2, sVertCount, sVertCount + 2, sVertCount + 3);
              sVertCount += 4;
            };

            addCrossQuad(d1Front);
            addCrossQuad(d1Back);
            addCrossQuad(d2Front);
            addCrossQuad(d2Back);
            continue;
          }

          // 2. Water Blocks
          if (blockProps.isWater) {
            const texName = blockProps.textures.top || 'water';
            const { u0, v0, u1, v1 } = this.textureAtlas.getTileUV(texName);

            for (let f = 0; f < FACES.length; f++) {
              const face = FACES[f];
              const nx = gx + face.dir[0];
              const ny = gy + face.dir[1];
              const nz = gz + face.dir[2];

              const neighborBlock = world.getBlock(nx, ny, nz);
              const neighborProps = BLOCK_PROPERTIES[neighborBlock];

              // Water face only renders against AIR or transparent non-water blocks
              if (neighborBlock === BLOCK.WATER) continue;
              if (neighborProps && neighborProps.solid) continue;

              const c0 = face.corners[0];
              const c1 = face.corners[1];
              const c2 = face.corners[2];
              const c3 = face.corners[3];

              // Slightly lower water surface for realistic water level
              const yOffset = (face.name === 'top') ? -0.1 : 0.0;

              wPos.push(
                gx + c0[0], gy + c0[1] + (c0[1] === 1 ? yOffset : 0), gz + c0[2],
                gx + c1[0], gy + c1[1] + (c1[1] === 1 ? yOffset : 0), gz + c1[2],
                gx + c2[0], gy + c2[1] + (c2[1] === 1 ? yOffset : 0), gz + c2[2],
                gx + c3[0], gy + c3[1] + (c3[1] === 1 ? yOffset : 0), gz + c3[2]
              );

              let light = 1.0;
              if (face.name === 'bottom') light = 0.6;
              else if (face.name !== 'top') light = 0.85;

              for (let k = 0; k < 4; k++) {
                wNorm.push(face.dir[0], face.dir[1], face.dir[2]);
                wCol.push(light, light, light);
              }

              wUv.push(u0, v0, u1, v0, u1, v1, u0, v1);
              wInd.push(wVertCount, wVertCount + 1, wVertCount + 2, wVertCount, wVertCount + 2, wVertCount + 3);
              wVertCount += 4;
            }
            continue;
          }

          // 3. Standard Solid / Voxel Blocks
          for (let f = 0; f < FACES.length; f++) {
            const face = FACES[f];
            const nx = gx + face.dir[0];
            const ny = gy + face.dir[1];
            const nz = gz + face.dir[2];

            const neighborBlock = world.getBlock(nx, ny, nz);
            const neighborProps = BLOCK_PROPERTIES[neighborBlock];

            let shouldRender = false;
            if (neighborBlock === BLOCK.AIR || neighborBlock === BLOCK.WATER) {
              shouldRender = true;
            } else if (neighborProps && neighborProps.transparent) {
              if (!blockProps.transparent || blockId !== neighborBlock) {
                shouldRender = true;
              }
            }

            if (!shouldRender) continue;

            const texName = blockProps.textures[face.name] || blockProps.textures.top;
            const { u0, v0, u1, v1 } = this.textureAtlas.getTileUV(texName);

            const c0 = face.corners[0];
            const c1 = face.corners[1];
            const c2 = face.corners[2];
            const c3 = face.corners[3];

            let faceLight = 1.0;
            if (face.name === 'top') faceLight = 1.0;
            else if (face.name === 'bottom') faceLight = 0.55;
            else if (face.name === 'east' || face.name === 'west') faceLight = 0.88;
            else if (face.name === 'north' || face.name === 'south') faceLight = 0.76;

            sPos.push(
              gx + c0[0], gy + c0[1], gz + c0[2],
              gx + c1[0], gy + c1[1], gz + c1[2],
              gx + c2[0], gy + c2[1], gz + c2[2],
              gx + c3[0], gy + c3[1], gz + c3[2]
            );

            for (let k = 0; k < 4; k++) {
              sNorm.push(face.dir[0], face.dir[1], face.dir[2]);
              sCol.push(faceLight, faceLight, faceLight);
            }

            sUv.push(u0, v0, u1, v0, u1, v1, u0, v1);
            sInd.push(sVertCount, sVertCount + 1, sVertCount + 2, sVertCount, sVertCount + 2, sVertCount + 3);
            sVertCount += 4;
          }
        }
      }
    }

    // Build solid geometry
    let solidGeometry = null;
    if (sVertCount > 0) {
      solidGeometry = new THREE.BufferGeometry();
      solidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
      solidGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(sNorm, 3));
      solidGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
      solidGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sCol, 3));
      solidGeometry.setIndex(sInd);
    }

    // Build water geometry
    let waterGeometry = null;
    if (wVertCount > 0) {
      waterGeometry = new THREE.BufferGeometry();
      waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
      waterGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(wNorm, 3));
      waterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
      waterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
      waterGeometry.setIndex(wInd);
    }

    return { solidGeometry, waterGeometry };
  }
}

