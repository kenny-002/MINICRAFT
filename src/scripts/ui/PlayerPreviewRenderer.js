import * as THREE from 'three';
import { ITEMS } from '../items/ItemTypes.js';

/**
 * 3D Voxel Character Preview Renderer for BlockWorld's Survival Inventory UI.
 * Renders an original, stylized 3D voxel player model in real-time with
 * equipped armor overlays, idle animations, and mouse-following head/body rotation.
 */
export class PlayerPreviewRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.clientWidth || 140;
    this.height = canvas.clientHeight || 190;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 20);
    this.camera.position.set(0, 0.9, 3.2);
    this.camera.lookAt(0, 0.85, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: false, // Crisp voxel pixels
        powerPreference: 'low-power',
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
      console.warn('PlayerPreviewRenderer WebGL fallback:', err.message);
      this.renderer = {
        setSize: () => {},
        setPixelRatio: () => {},
        render: () => {},
        dispose: () => {},
      };
    }

    // Studio Lighting for clean pixel preview
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.4);
    rimLight.position.set(-2, 1, -2);
    this.scene.add(rimLight);

    // Player Root Model
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.armorMeshes = {
      head: null,
      chest: null,
      legs: null,
      feet: null,
    };

    this.animTime = 0;
    this.isRunning = false;
    this.targetRotationY = 0;
    this.currentRotationY = 0;

    this._buildCharacterModel();
    this._bindMouseEvents();
  }

  _buildCharacterModel() {
    // Voxel Materials
    const makeMat = (colorHex, roughness = 0.75, metalness = 0.1) =>
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness,
        metalness,
      });

    const skinMat = makeMat(0xf4c29e); // Warm skin tone
    const hairMat = makeMat(0x3e2723); // Dark brown hair
    const eyeMat = makeMat(0x1e3a8a);  // Deep sapphire eyes
    const eyeWhite = makeMat(0xffffff);
    const shirtMat = makeMat(0x0284c7); // Explorer teal tunic
    const beltMat = makeMat(0x27272a);  // Dark leather belt
    const buckleMat = makeMat(0xf59e0b, 0.4, 0.6); // Gold buckle
    const pantsMat = makeMat(0x334155); // Slate explorer pants
    const shoeMat = makeMat(0x451a03);  // Leather boots

    // --- 1. HEAD GROUP ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.42, 0);

    // Head base (0.44 x 0.44 x 0.44)
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
    this.headGroup.add(headMesh);

    // Hair cap
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), hairMat);
    hairMesh.position.set(0, 0.14, -0.02);
    this.headGroup.add(hairMesh);

    // Hair fringe
    const hairFringe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.12), hairMat);
    hairFringe.position.set(0, 0.18, 0.2);
    this.headGroup.add(hairFringe);

    // Eyes
    const leftEyeW = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.02), eyeWhite);
    leftEyeW.position.set(-0.11, 0.02, 0.225);
    const leftEyeP = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), eyeMat);
    leftEyeP.position.set(-0.09, 0.02, 0.23);
    this.headGroup.add(leftEyeW, leftEyeP);

    const rightEyeW = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.02), eyeWhite);
    rightEyeW.position.set(0.11, 0.02, 0.225);
    const rightEyeP = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), eyeMat);
    rightEyeP.position.set(0.09, 0.02, 0.23);
    this.headGroup.add(rightEyeW, rightEyeP);

    this.rootGroup.add(this.headGroup);

    // --- 2. TORSO GROUP ---
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.94, 0);

    // Shirt / Tunic (0.52 x 0.62 x 0.28)
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.28), shirtMat);
    this.torsoGroup.add(torsoMesh);

    // Belt
    const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.3), beltMat);
    beltMesh.position.set(0, -0.24, 0);
    this.torsoGroup.add(beltMesh);

    // Buckle
    const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.32), buckleMat);
    buckleMesh.position.set(0, -0.24, 0);
    this.torsoGroup.add(buckleMesh);

    this.rootGroup.add(this.torsoGroup);

    // --- 3. ARMS ---
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.38, 1.15, 0);
    const leftArmSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.24), shirtMat);
    leftArmSleeve.position.set(0, -0.1, 0);
    const leftArmSkin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), skinMat);
    leftArmSkin.position.set(0, -0.38, 0);
    this.leftArmGroup.add(leftArmSleeve, leftArmSkin);
    this.rootGroup.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.38, 1.15, 0);
    const rightArmSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.24), shirtMat);
    rightArmSleeve.position.set(0, -0.1, 0);
    const rightArmSkin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), skinMat);
    rightArmSkin.position.set(0, -0.38, 0);
    this.rightArmGroup.add(rightArmSleeve, rightArmSkin);
    this.rootGroup.add(this.rightArmGroup);

    // --- 4. LEGS ---
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.14, 0.62, 0);
    const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.42, 0.26), pantsMat);
    leftPants.position.set(0, -0.21, 0);
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.28), shoeMat);
    leftBoot.position.set(0, -0.52, 0.01);
    this.leftLegGroup.add(leftPants, leftBoot);
    this.rootGroup.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.14, 0.62, 0);
    const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.42, 0.26), pantsMat);
    rightPants.position.set(0, -0.21, 0);
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.28), shoeMat);
    rightBoot.position.set(0, -0.52, 0.01);
    this.rightLegGroup.add(rightPants, rightBoot);
    this.rootGroup.add(this.rightLegGroup);
  }

  _bindMouseEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.targetRotationY = nx * 0.65;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.targetRotationY = 0;
    });
  }

  /**
   * Update 3D equipped armor overlays
   */
  updateArmor(equipment = {}) {
    // 1. HELMET
    if (this.armorMeshes.head) {
      this.headGroup.remove(this.armorMeshes.head);
      this.armorMeshes.head = null;
    }
    const headItem = equipment.head ? equipment.head.itemId : null;
    if (headItem === ITEMS.IRON_HELMET || headItem === ITEMS.CRYSTAL_HELMET) {
      const isCrys = headItem === ITEMS.CRYSTAL_HELMET;
      const mat = new THREE.MeshStandardMaterial({
        color: isCrys ? 0x00e5ff : 0xb0bec5,
        metalness: isCrys ? 0.3 : 0.7,
        roughness: isCrys ? 0.2 : 0.4,
        emissive: isCrys ? 0x004455 : 0x000000,
      });

      const helmetGroup = new THREE.Group();
      // Helmet Crown / Visor
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.52), mat);
      dome.position.set(0, 0.06, 0);
      helmetGroup.add(dome);

      if (isCrys) {
        // Glowing crystal crown points
        const spikeGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x00e5ff });
        const spk1 = new THREE.Mesh(spikeGeo, spikeMat);
        spk1.position.set(0, 0.35, 0.24);
        const spk2 = new THREE.Mesh(spikeGeo, spikeMat);
        spk2.position.set(-0.2, 0.32, 0);
        const spk3 = new THREE.Mesh(spikeGeo, spikeMat);
        spk3.position.set(0.2, 0.32, 0);
        helmetGroup.add(spk1, spk2, spk3);
      } else {
        // Iron visor bar
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.9, roughness: 0.2 });
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.12), visorMat);
        visor.position.set(0, 0.02, 0.23);
        helmetGroup.add(visor);
      }

      this.armorMeshes.head = helmetGroup;
      this.headGroup.add(helmetGroup);
    }

    // 2. CHESTPLATE
    if (this.armorMeshes.chest) {
      this.torsoGroup.remove(this.armorMeshes.chest);
      this.armorMeshes.chest = null;
    }
    const chestItem = equipment.chest ? equipment.chest.itemId : null;
    if (chestItem === ITEMS.IRON_CHESTPLATE || chestItem === ITEMS.CRYSTAL_CHESTPLATE) {
      const isCrys = chestItem === ITEMS.CRYSTAL_CHESTPLATE;
      const mat = new THREE.MeshStandardMaterial({
        color: isCrys ? 0x00e5ff : 0xb0bec5,
        metalness: isCrys ? 0.3 : 0.75,
        roughness: isCrys ? 0.25 : 0.35,
        emissive: isCrys ? 0x003344 : 0x000000,
      });

      const chestGroup = new THREE.Group();
      // Cuirass
      const cuirass = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.66, 0.34), mat);
      chestGroup.add(cuirass);

      // Pauldrons
      const pauldronGeo = new THREE.BoxGeometry(0.28, 0.22, 0.3);
      const leftP = new THREE.Mesh(pauldronGeo, mat);
      leftP.position.set(-0.38, 0.24, 0);
      const rightP = new THREE.Mesh(pauldronGeo, mat);
      rightP.position.set(0.38, 0.24, 0);
      chestGroup.add(leftP, rightP);

      this.armorMeshes.chest = chestGroup;
      this.torsoGroup.add(chestGroup);
    }

    // 3. LEGGINGS
    if (this.armorMeshes.legs) {
      this.leftLegGroup.remove(this.armorMeshes.legs.left);
      this.rightLegGroup.remove(this.armorMeshes.legs.right);
      this.armorMeshes.legs = null;
    }
    const legsItem = equipment.legs ? equipment.legs.itemId : null;
    if (legsItem === ITEMS.IRON_LEGGINGS || legsItem === ITEMS.CRYSTAL_LEGGINGS) {
      const isCrys = legsItem === ITEMS.CRYSTAL_LEGGINGS;
      const mat = new THREE.MeshStandardMaterial({
        color: isCrys ? 0x00e5ff : 0xb0bec5,
        metalness: isCrys ? 0.3 : 0.7,
        roughness: isCrys ? 0.25 : 0.35,
      });

      const legGeo = new THREE.BoxGeometry(0.27, 0.44, 0.29);
      const leftGreave = new THREE.Mesh(legGeo, mat);
      leftGreave.position.set(0, -0.21, 0);
      const rightGreave = new THREE.Mesh(legGeo, mat);
      rightGreave.position.set(0, -0.21, 0);

      this.leftLegGroup.add(leftGreave);
      this.rightLegGroup.add(rightGreave);
      this.armorMeshes.legs = { left: leftGreave, right: rightGreave };
    }

    // 4. BOOTS
    if (this.armorMeshes.feet) {
      this.leftLegGroup.remove(this.armorMeshes.feet.left);
      this.rightLegGroup.remove(this.armorMeshes.feet.right);
      this.armorMeshes.feet = null;
    }
    const feetItem = equipment.feet ? equipment.feet.itemId : null;
    if (feetItem === ITEMS.IRON_BOOTS || feetItem === ITEMS.CRYSTAL_BOOTS) {
      const isCrys = feetItem === ITEMS.CRYSTAL_BOOTS;
      const mat = new THREE.MeshStandardMaterial({
        color: isCrys ? 0x00e5ff : 0x90a4ae,
        metalness: isCrys ? 0.3 : 0.7,
        roughness: isCrys ? 0.2 : 0.4,
      });

      const bootGeo = new THREE.BoxGeometry(0.28, 0.26, 0.32);
      const leftSabat = new THREE.Mesh(bootGeo, mat);
      leftSabat.position.set(0, -0.52, 0.02);
      const rightSabat = new THREE.Mesh(bootGeo, mat);
      rightSabat.position.set(0, -0.52, 0.02);

      this.leftLegGroup.add(leftSabat);
      this.rightLegGroup.add(rightSabat);
      this.armorMeshes.feet = { left: leftSabat, right: rightSabat };
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._lastTime = performance.now();
    this._animate();
  }

  stop() {
    this.isRunning = false;
  }

  _animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this._animate);

    const now = performance.now();
    const delta = Math.min((now - (this._lastTime || now)) / 1000, 0.1);
    this._lastTime = now;
    this.animTime += delta;

    // Smooth rotation toward mouse
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * Math.min(1, delta * 8);
    this.rootGroup.rotation.y = this.currentRotationY;

    // Idle breathing & gentle bobbing
    const breath = Math.sin(this.animTime * 2.2);
    this.torsoGroup.position.y = 0.94 + breath * 0.015;
    this.headGroup.position.y = 1.42 + breath * 0.02;
    this.headGroup.rotation.x = Math.sin(this.animTime * 1.5) * 0.03;

    // Slight arm sway
    this.leftArmGroup.rotation.x = Math.sin(this.animTime * 1.8) * 0.06;
    this.rightArmGroup.rotation.x = -Math.sin(this.animTime * 1.8) * 0.06;

    this.renderer.render(this.scene, this.camera);
  };
}
