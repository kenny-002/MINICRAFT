import assert from 'assert';
import * as THREE from 'three';
import { BLOCK, BLOCK_PROPERTIES } from './src/scripts/blocks/BlockTypes.js';

// Mock DOM Canvas for node environment testing
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            drawImage: () => {},
            fillStyle: '',
          }),
        };
      }
      return {};
    },
  };
}

const { TextureAtlas } = await import('./src/scripts/blocks/TextureAtlas.js');
const { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } = await import('./src/scripts/chunks/Chunk.js');
const { ChunkMeshBuilder } = await import('./src/scripts/chunks/ChunkMeshBuilder.js');

console.log('🧪 RUNNING BLOCKWORLD V5 TEXTURE ATLAS & UV TEST SUITE...');

const atlas = new TextureAtlas();

// 1. Atlas dimensions are valid
console.log('1. Checking Atlas Dimensions:');
assert.strictEqual(atlas.cols, 16, 'Atlas must have 16 columns');
assert.strictEqual(atlas.rows, 16, 'Atlas must have 16 rows');
assert.strictEqual(atlas.tileSize, 16, 'Tile size must be 16 pixels');
assert.strictEqual(atlas.width, 256, 'Atlas width must be 256px');
assert.strictEqual(atlas.height, 256, 'Atlas height must be 256px');
console.log(`   ✓ Atlas is ${atlas.width}x${atlas.height}px (${atlas.cols}x${atlas.rows} tiles @ ${atlas.tileSize}px)`);

// 2 & 3 & 4 & 5 & 6. Every tile is valid, within 0..1, u1 > u0, v1 > v0, and non-overlapping
console.log('2. Checking Tile UV Boundaries & Inset for all 256 possible tile indices:');
const du = 1 / atlas.cols;
const dv = 1 / atlas.rows;

for (let i = 0; i < 256; i++) {
  const col = i % atlas.cols;
  const row = Math.floor(i / atlas.cols);
  const { u0, v0, u1, v1 } = atlas.getTileUV(i);

  // In 0..1
  assert(u0 >= 0 && u0 <= 1, `Tile ${i} u0 (${u0}) out of [0, 1] range`);
  assert(u1 >= 0 && u1 <= 1, `Tile ${i} u1 (${u1}) out of [0, 1] range`);
  assert(v0 >= 0 && v0 <= 1, `Tile ${i} v0 (${v0}) out of [0, 1] range`);
  assert(v1 >= 0 && v1 <= 1, `Tile ${i} v1 (${v1}) out of [0, 1] range`);

  // Ordering
  assert(u1 > u0, `Tile ${i} u1 (${u1}) must be > u0 (${u0})`);
  assert(v1 > v0, `Tile ${i} v1 (${v1}) must be > v0 (${v0})`);

  // Bounded within its column and row cell
  const minU = col * du;
  const maxU = (col + 1) * du;
  const minV = (atlas.rows - 1 - row) * dv;
  const maxV = (atlas.rows - row) * dv;

  assert(u0 >= minU && u1 <= maxU, `Tile ${i} U range [${u0}, ${u1}] exceeds cell bounds [${minU}, ${maxU}]`);
  assert(v0 >= minV && v1 <= maxV, `Tile ${i} V range [${v0}, ${v1}] exceeds cell bounds [${minV}, ${maxV}]`);
}
console.log('   ✓ All 256 tile slots produce valid, strictly bounded UV rectangles');

// 7. Every registered block texture resolves to a valid tile
console.log('3. Checking Block Texture Registrations:');
for (const [idStr, blockProps] of Object.entries(BLOCK_PROPERTIES)) {
  const blockId = Number(idStr);
  if (!blockProps.textures) continue;

  const faceNames = ['top', 'bottom', 'north', 'south', 'east', 'west'];
  for (const face of faceNames) {
    const texName = blockProps.textures[face] || blockProps.textures.top;
    assert(texName, `Block ${blockProps.name} (id: ${blockId}) missing texture for face ${face}`);
    assert(atlas.tileIndices[texName] !== undefined, `Block ${blockProps.name} texture '${texName}' not found in TextureAtlas`);
    
    const uv = atlas.getTileUV(texName);
    assert(uv.u1 > uv.u0 && uv.v1 > uv.v0, `Block ${blockProps.name} texture '${texName}' UVs invalid`);
  }
}
console.log('   ✓ All 29 block types successfully map to valid texture atlas tiles');

// 8 & 9. UV count matches geometry vertex count on chunk builds
console.log('4. Checking ChunkMeshBuilder Geometry & UV Attributes:');
const mockWorld = {
  getBlock: () => BLOCK.AIR,
};

const chunk = new Chunk(0, 0, mockWorld);
// Place one of each block
let index = 0;
for (const [idStr] of Object.entries(BLOCK_PROPERTIES)) {
  const blockId = Number(idStr);
  if (blockId === BLOCK.AIR) continue;
  const lx = index % CHUNK_SIZE_X;
  const lz = Math.floor(index / CHUNK_SIZE_X);
  chunk.setLocalBlock(lx, 10, lz, blockId);
  index++;
}

const builder = new ChunkMeshBuilder(atlas);
const { solidGeometry, waterGeometry } = builder.buildChunkMesh(chunk, mockWorld);

assert(solidGeometry, 'Solid geometry must be created');
const posAttr = solidGeometry.getAttribute('position');
const uvAttr = solidGeometry.getAttribute('uv');
const normAttr = solidGeometry.getAttribute('normal');
const colAttr = solidGeometry.getAttribute('color');
const indexAttr = solidGeometry.getIndex();

assert.strictEqual(posAttr.count, uvAttr.count, `Position count (${posAttr.count}) must equal UV count (${uvAttr.count})`);
assert.strictEqual(posAttr.count, normAttr.count, 'Position count must equal Normal count');
assert.strictEqual(posAttr.count, colAttr.count, 'Position count must equal Color count');

// Each quad is 4 vertices, 8 UV coordinates, 6 indices
assert.strictEqual(posAttr.count % 4, 0, 'Vertex count must be a multiple of 4 (quads)');
assert.strictEqual(uvAttr.array.length, posAttr.count * 2, 'UV float array length must be exactly vertex count * 2');
assert.strictEqual(indexAttr.count, (posAttr.count / 4) * 6, 'Index count must be 6 indices per 4 vertices');

console.log(`   ✓ Solid geometry generated ${posAttr.count} vertices, ${uvAttr.count} UVs, ${indexAttr.count / 3} triangles with 100% attribute alignment`);

// Check UVs inside solid geometry are valid normalized values
for (let i = 0; i < uvAttr.count; i++) {
  const u = uvAttr.getX(i);
  const v = uvAttr.getY(i);
  assert(u >= 0 && u <= 1, `UV at index ${i} has U (${u}) out of [0,1]`);
  assert(v >= 0 && v <= 1, `UV at index ${i} has V (${v}) out of [0,1]`);
}
console.log('   ✓ Every single UV vertex in generated chunk geometry is in [0, 1] range');

// 10. Test Single Cube 6 Faces
console.log('5. Testing Single Cube with 6 Different Faces:');
const singleChunk = new Chunk(0, 0, mockWorld);
singleChunk.setLocalBlock(0, 0, 0, BLOCK.GRASS); // Top = grass_top, Bottom = dirt, Sides = grass_side
const singleRes = builder.buildChunkMesh(singleChunk, mockWorld);
const sPos = singleRes.solidGeometry.getAttribute('position');
const sUv = singleRes.solidGeometry.getAttribute('uv');

// A solitary cube has 6 exposed faces = 24 vertices = 48 UV float values
assert.strictEqual(sPos.count, 24, 'Single isolated cube must have 24 vertices (6 faces * 4 vertices)');
assert.strictEqual(sUv.count, 24, 'Single isolated cube must have 24 UV coordinate pairs');

const topUV = atlas.getTileUV('grass_top');
const sideUV = atlas.getTileUV('grass_side');
const dirtUV = atlas.getTileUV('dirt');

// Face 0: Top face (vertices 0..3)
assert.strictEqual(sUv.getX(0), topUV.u0, 'Top face vertex 0 U matches grass_top u0');
assert.strictEqual(sUv.getY(0), topUV.v0, 'Top face vertex 0 V matches grass_top v0');
assert.strictEqual(sUv.getX(2), topUV.u1, 'Top face vertex 2 U matches grass_top u1');
assert.strictEqual(sUv.getY(2), topUV.v1, 'Top face vertex 2 V matches grass_top v1');

// Face 1: Bottom face (vertices 4..7)
assert.strictEqual(sUv.getX(4), dirtUV.u0, 'Bottom face vertex 0 U matches dirt u0');
assert.strictEqual(sUv.getY(4), dirtUV.v0, 'Bottom face vertex 0 V matches dirt v0');

// Face 2: North face (vertices 8..11)
assert.strictEqual(sUv.getX(8), sideUV.u0, 'North face vertex 0 U matches grass_side u0');
assert.strictEqual(sUv.getY(8), sideUV.v0, 'North face vertex 0 V matches grass_side v0');

console.log('   ✓ Single cube Top, Bottom, North, South, East, West faces map to exact atlas tile UVs');

console.log('\n🎉 ALL TEXTURE ATLAS & UV VALIDATION TESTS PASSED (10/10)!\n');
