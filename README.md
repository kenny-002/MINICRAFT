# BlockWorld — 3D Voxel Survival Game (Version 1)

A playable 3D voxel sandbox and survival game engine built with original assets, custom procedural texture atlases, deterministic simplex terrain generation, chunk streaming, voxel collision physics, item management, and local persistence.

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Jump** | <kbd>Space</kbd> |
| **Sprint** | <kbd>Shift</kbd> |
| **Look Around** | <kbd>Mouse</kbd> (Pointer Lock) |
| **Break Block** | <kbd>Left Mouse Button</kbd> |
| **Place Block** | <kbd>Right Mouse Button</kbd> |
| **Select Hotbar Slot** | <kbd>1</kbd> - <kbd>6</kbd> or <kbd>Mouse Wheel</kbd> |
| **Backpack / Inventory** | <kbd>E</kbd> |
| **Debug HUD** | <kbd>F3</kbd> |
| **Menu / Pause / Unlock Cursor** | <kbd>Esc</kbd> |

---

## 🏗️ Architecture & Modular Project Structure

```
/src
  /scripts
    /player
      - Player.js               # Coordinates camera, movement, raycasting, block breaking & placing
      - PlayerPhysics.js        # Swept AABB discrete voxel collision, gravity, jumping, sprinting
      - CameraController.js     # PointerLock API, pitch/yaw rotation clamp
    /world
      - World.js                # Coordinates chunks, dynamic block modification, raycast lookup
      - TerrainGenerator.js     # Deterministic multi-octave simplex terrain (hills, valleys, beach, trees)
    /blocks
      - BlockTypes.js           # Block registry (AIR, GRASS, DIRT, STONE, SAND, WOOD, LEAVES)
      - TextureAtlas.js         # Procedural 16x16 pixel art texture generator (100% original assets)
    /chunks
      - Chunk.js                # 16x64x16 voxel volume storage
      - ChunkMeshBuilder.js     # Culled face geometry generator with vertex ambient occlusion
    /inventory
      - Inventory.js            # Item count tracking, add/remove, change listeners
      - Hotbar.js               # 6 active quick-slots with number key & wheel cycling
    /environment
      - DayNightCycle.js        # Rotating sun directional light, ambient lighting, sky color gradient
    /ui
      - UIManager.js            # Hotbar HUD, Backpack modal, Crosshair, F3 Debug panel, Toasts
    /save
      - SaveSystem.js           # LocalStorage persistence for player pos, world seed, modified blocks, items
    /utilities
      - SimplexNoise.js         # Seeded deterministic PRNG and 2D/3D Simplex noise
      - VoxelRaycaster.js       # Fast 3D Amanatides-Woo DDA voxel grid raycaster
  main.js                       # Game loop & state machine
index.html                      # DOM structure & HUD overlays
style.css                       # Modern dark glassmorphism styling
package.json                    # Vite & Three.js dependencies
```

---

## 🚀 How to Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:3000/`.
