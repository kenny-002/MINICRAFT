import { BLOCK, BLOCK_PROPERTIES } from '../blocks/BlockTypes.js';

/**
 * Fast 3D Voxel DDA (Amanatides & Woo) Grid Raycaster.
 * Returns the exact voxel block hit and the normal of the hit face.
 */
export class VoxelRaycaster {
  static raycast(world, origin, direction, maxDistance = 6.0) {
    const dirX = direction.x;
    const dirY = direction.y;
    const dirZ = direction.z;

    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    let x = Math.floor(px);
    let y = Math.floor(py);
    let z = Math.floor(pz);

    const stepX = dirX > 0 ? 1 : dirX < 0 ? -1 : 0;
    const stepY = dirY > 0 ? 1 : dirY < 0 ? -1 : 0;
    const stepZ = dirZ > 0 ? 1 : dirZ < 0 ? -1 : 0;

    const tDeltaX = dirX !== 0 ? Math.abs(1 / dirX) : Infinity;
    const tDeltaY = dirY !== 0 ? Math.abs(1 / dirY) : Infinity;
    const tDeltaZ = dirZ !== 0 ? Math.abs(1 / dirZ) : Infinity;

    let tMaxX = dirX > 0 ? (x + 1 - px) * tDeltaX : (px - x) * tDeltaX;
    let tMaxY = dirY > 0 ? (y + 1 - py) * tDeltaY : (py - y) * tDeltaY;
    let tMaxZ = dirZ > 0 ? (z + 1 - pz) * tDeltaZ : (pz - z) * tDeltaZ;

    let hitNormalX = 0;
    let hitNormalY = 0;
    let hitNormalZ = 0;

    let dist = 0;

    while (dist <= maxDistance) {
      const blockId = world.getBlock(x, y, z);
      const props = BLOCK_PROPERTIES[blockId];

      if (blockId !== BLOCK.AIR && props && props.solid) {
        return {
          hit: true,
          blockId,
          x, y, z,
          faceNormal: { x: hitNormalX, y: hitNormalY, z: hitNormalZ },
          adjacent: {
            x: x + hitNormalX,
            y: y + hitNormalY,
            z: z + hitNormalZ,
          },
          distance: dist,
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          dist = tMaxX;
          tMaxX += tDeltaX;
          hitNormalX = -stepX;
          hitNormalY = 0;
          hitNormalZ = 0;
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          hitNormalX = 0;
          hitNormalY = 0;
          hitNormalZ = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          dist = tMaxY;
          tMaxY += tDeltaY;
          hitNormalX = 0;
          hitNormalY = -stepY;
          hitNormalZ = 0;
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          hitNormalX = 0;
          hitNormalY = 0;
          hitNormalZ = -stepZ;
        }
      }
    }

    return { hit: false };
  }
}
