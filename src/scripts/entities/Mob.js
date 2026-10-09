import * as THREE from 'three';
import { Entity } from './Entity.js';
import { MobAI } from './MobAI.js';
import { MobDropTable } from './MobDropTable.js';

export const MOB_TYPE = {
  MEADOW_DEER: 'MEADOW_DEER',
  FOREST_BOAR: 'FOREST_BOAR',
  SKY_BIRD: 'SKY_BIRD',
  CAVE_STALKER: 'CAVE_STALKER',
  NIGHT_HOWLER: 'NIGHT_HOWLER',
};

/**
 * Procedural Voxel Mob entity with hierarchical box meshes, walking animations,
 * hit flash, and AI integration.
 */
export class Mob extends Entity {
  constructor(world, scene, mobType, options = {}) {
    // Determine Mob Base Attributes
    let health = 20;
    let isHostile = false;
    let isNeutral = false;
    let isFlying = false;
    let width = 0.8;
    let height = 1.2;
    let depth = 0.8;
    let attackDmg = 0;

    switch (mobType) {
      case MOB_TYPE.MEADOW_DEER:
        health = 18;
        width = 0.9;
        height = 1.4;
        depth = 1.1;
        break;
      case MOB_TYPE.FOREST_BOAR:
        health = 26;
        width = 1.0;
        height = 1.0;
        depth = 1.2;
        isNeutral = true;
        attackDmg = 8;
        break;
      case MOB_TYPE.SKY_BIRD:
        health = 10;
        width = 0.6;
        height = 0.5;
        depth = 0.6;
        isFlying = true;
        break;
      case MOB_TYPE.CAVE_STALKER:
        health = 32;
        width = 1.0;
        height = 1.1;
        depth = 1.0;
        isHostile = true;
        attackDmg = 12;
        break;
      case MOB_TYPE.NIGHT_HOWLER:
        health = 38;
        width = 1.1;
        height = 1.3;
        depth = 1.3;
        isHostile = true;
        attackDmg = 15;
        break;
    }

    super(world, mobType, {
      ...options,
      maxHealth: health,
      width,
      height,
      depth,
      isFlying,
    });

    this.scene = scene;
    this.mobType = mobType;

    // Build procedural 3D visual mesh
    this.animParts = {};
    this.mesh = this._buildProceduralModel(mobType);
    if (this.scene && this.mesh) {
      this.scene.add(this.mesh);
    }

    // Attach AI controller
    this.ai = new MobAI(this, {
      isHostile,
      isNeutral,
      isFlying,
      attackDamage: attackDmg,
    });

    this.animTimer = Math.random() * 10;
  }

  _buildProceduralModel(type) {
    const group = new THREE.Group();

    // Standard stylized voxel materials
    const makeMat = (colorHex, roughness = 0.8, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness,
        emissive,
      });

    switch (type) {
      case MOB_TYPE.MEADOW_DEER: {
        const bodyMat = makeMat(0xa66a38); // Chestnut brown
        const bellyMat = makeMat(0xe8d0b5); // Cream
        const antlerMat = makeMat(0x4a3728); // Dark antler
        const eyeMat = makeMat(0x1a1a1a); // Dark eye
        const hoofMat = makeMat(0x3a2818); // Dark hoof
        const spotMat = makeMat(0xf0dec8); // Light fur spots

        // Torso
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), bodyMat);
        body.position.y = 0.75;
        group.add(body);

        // Light fur spots on flank
        const spotL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.25, 0.5), spotMat);
        spotL.position.set(0, 0.85, -0.1);
        group.add(spotL);

        // Underbelly
        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.9), bellyMat);
        belly.position.set(0, 0.55, 0);
        group.add(belly);

        // Neck & Head
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.35), bodyMat);
        neck.position.set(0, 1.15, 0.45);
        neck.rotation.x = 0.25;
        group.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.45), bodyMat);
        head.position.set(0, 1.45, 0.6);
        group.add(head);

        // Muzzle & Black Eyes
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.2), bellyMat);
        muzzle.position.set(0, 1.38, 0.82);
        group.add(muzzle);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), eyeMat);
        eyeL.position.set(-0.18, 1.5, 0.65);
        group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), eyeMat);
        eyeR.position.set(0.18, 1.5, 0.65);
        group.add(eyeR);

        // Antlers with branch prongs
        const leftAntler = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), antlerMat);
        leftAntler.position.set(-0.2, 1.75, 0.5);
        leftAntler.rotation.z = -0.3;
        group.add(leftAntler);

        const leftProng = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), antlerMat);
        leftProng.position.set(-0.32, 1.85, 0.55);
        leftProng.rotation.z = -0.7;
        group.add(leftProng);

        const rightAntler = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), antlerMat);
        rightAntler.position.set(0.2, 1.75, 0.5);
        rightAntler.rotation.z = 0.3;
        group.add(rightAntler);

        const rightProng = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), antlerMat);
        rightProng.position.set(0.32, 1.85, 0.55);
        rightProng.rotation.z = 0.7;
        group.add(rightProng);

        // Tail
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), bellyMat);
        tail.position.set(0, 0.85, -0.6);
        tail.rotation.x = -0.4;
        group.add(tail);

        // 4 Legs with hooves
        const legGeom = new THREE.BoxGeometry(0.18, 0.6, 0.18);
        const legMat = makeMat(0x8a5326);

        const createLeg = (x, z) => {
          const legGroup = new THREE.Group();
          const legMesh = new THREE.Mesh(legGeom, legMat);
          legGroup.add(legMesh);
          const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.19), hoofMat);
          hoof.position.y = -0.23;
          legGroup.add(hoof);
          legGroup.position.set(x, 0.3, z);
          return legGroup;
        };

        this.animParts.legFL = createLeg(-0.25, 0.4);
        group.add(this.animParts.legFL);

        this.animParts.legFR = createLeg(0.25, 0.4);
        group.add(this.animParts.legFR);

        this.animParts.legBL = createLeg(-0.25, -0.4);
        group.add(this.animParts.legBL);

        this.animParts.legBR = createLeg(0.25, -0.4);
        group.add(this.animParts.legBR);
        break;
      }

      case MOB_TYPE.FOREST_BOAR: {
        const boarMat = makeMat(0x4a3728);
        const snoutMat = makeMat(0x735138);
        const tuskMat = makeMat(0xf0f3f4);
        const eyeMat = makeMat(0x1a1a1a);
        const bristleMat = makeMat(0x352316);

        // Body with back ridge bristles
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 1.1), boarMat);
        body.position.y = 0.6;
        group.add(body);

        const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.9), bristleMat);
        bristles.position.set(0, 0.95, 0);
        group.add(bristles);

        // Stout Head & Snout
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.55), boarMat);
        head.position.set(0, 0.65, 0.65);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.3), snoutMat);
        snout.position.set(0, 0.55, 0.95);
        group.add(snout);

        // Nostrils
        const nostrilL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), eyeMat);
        nostrilL.position.set(-0.08, 0.55, 1.1);
        group.add(nostrilL);

        const nostrilR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), eyeMat);
        nostrilR.position.set(0.08, 0.55, 1.1);
        group.add(nostrilR);

        // Eyes
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), eyeMat);
        eyeL.position.set(-0.26, 0.75, 0.7);
        group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), eyeMat);
        eyeR.position.set(0.26, 0.75, 0.7);
        group.add(eyeR);

        // White Curved Tusks
        const tuskL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), tuskMat);
        tuskL.position.set(-0.2, 0.65, 0.9);
        tuskL.rotation.x = -0.3;
        group.add(tuskL);

        const tuskR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), tuskMat);
        tuskR.position.set(0.2, 0.65, 0.9);
        tuskR.rotation.x = -0.3;
        group.add(tuskR);

        // 4 Legs
        const legGeom = new THREE.BoxGeometry(0.22, 0.35, 0.22);
        this.animParts.legFL = new THREE.Mesh(legGeom, boarMat);
        this.animParts.legFL.position.set(-0.3, 0.18, 0.35);
        group.add(this.animParts.legFL);

        this.animParts.legFR = new THREE.Mesh(legGeom, boarMat);
        this.animParts.legFR.position.set(0.3, 0.18, 0.35);
        group.add(this.animParts.legFR);

        this.animParts.legBL = new THREE.Mesh(legGeom, boarMat);
        this.animParts.legBL.position.set(-0.3, 0.18, -0.35);
        group.add(this.animParts.legBL);

        this.animParts.legBR = new THREE.Mesh(legGeom, boarMat);
        this.animParts.legBR.position.set(0.3, 0.18, -0.35);
        group.add(this.animParts.legBR);
        break;
      }

      case MOB_TYPE.SKY_BIRD: {
        const featherMat = makeMat(0x3498db); // Azure blue
        const chestMat = makeMat(0xeaf2f8); // White chest
        const beakMat = makeMat(0xf39c12); // Golden beak
        const eyeMat = makeMat(0x1a1a1a);

        // Bird Body & White Crest
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.55), featherMat);
        group.add(body);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.3), chestMat);
        chest.position.set(0, -0.05, 0.15);
        group.add(chest);

        // Beak & Eyes
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), beakMat);
        beak.position.set(0, 0.05, 0.35);
        group.add(beak);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
        eyeL.position.set(-0.18, 0.1, 0.2);
        group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), eyeMat);
        eyeR.position.set(0.18, 0.1, 0.2);
        group.add(eyeR);

        // Tail Feathers
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.3), featherMat);
        tail.position.set(0, 0.08, -0.35);
        tail.rotation.x = -0.2;
        group.add(tail);

        // Flapping Wings
        const wingGeom = new THREE.BoxGeometry(0.45, 0.06, 0.35);
        this.animParts.wingL = new THREE.Mesh(wingGeom, featherMat);
        this.animParts.wingL.position.set(-0.4, 0.1, 0);
        group.add(this.animParts.wingL);

        this.animParts.wingR = new THREE.Mesh(wingGeom, featherMat);
        this.animParts.wingR.position.set(0.4, 0.1, 0);
        group.add(this.animParts.wingR);
        break;
      }

      case MOB_TYPE.CAVE_STALKER: {
        const chitinMat = makeMat(0x23272a); // Abyssal chitin
        const eyeMat = makeMat(0xff0044, 0.2, 0xff0044); // Glowing crimson faceted eyes
        const mandMat = makeMat(0x3a3f44);

        // Segmented Thorax & Abdomen
        const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.8), chitinMat);
        thorax.position.y = 0.6;
        group.add(thorax);

        const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.9), chitinMat);
        abdomen.position.set(0, 0.65, -0.6);
        group.add(abdomen);

        // Glowing Eyes (Faceted compound eyes)
        const eyeL1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), eyeMat);
        eyeL1.position.set(-0.16, 0.72, 0.42);
        group.add(eyeL1);

        const eyeR1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), eyeMat);
        eyeR1.position.set(0.16, 0.72, 0.42);
        group.add(eyeR1);

        // Mandibles
        const mandL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.18), mandMat);
        mandL.position.set(-0.14, 0.48, 0.48);
        group.add(mandL);

        const mandR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.18), mandMat);
        mandR.position.set(0.14, 0.48, 0.48);
        group.add(mandR);

        // 4 Spidery Limbs
        const legGeom = new THREE.BoxGeometry(0.12, 0.6, 0.12);
        this.animParts.legFL = new THREE.Mesh(legGeom, chitinMat);
        this.animParts.legFL.position.set(-0.45, 0.3, 0.3);
        group.add(this.animParts.legFL);

        this.animParts.legFR = new THREE.Mesh(legGeom, chitinMat);
        this.animParts.legFR.position.set(0.45, 0.3, 0.3);
        group.add(this.animParts.legFR);

        this.animParts.legBL = new THREE.Mesh(legGeom, chitinMat);
        this.animParts.legBL.position.set(-0.45, 0.3, -0.3);
        group.add(this.animParts.legBL);

        this.animParts.legBR = new THREE.Mesh(legGeom, chitinMat);
        this.animParts.legBR.position.set(0.45, 0.3, -0.3);
        group.add(this.animParts.legBR);
        break;
      }

      case MOB_TYPE.NIGHT_HOWLER: {
        const shadowMat = makeMat(0x1a0f2e); // Midnight violet
        const underMat = makeMat(0x2d1b4d); // Violet fur belly
        const eyeMat = makeMat(0x00ffff, 0.2, 0x00ffff); // Glowing cyan eyes
        const earMat = makeMat(0x381f63);

        // Sleek Predator Torso
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 1.2), shadowMat);
        body.position.y = 0.7;
        group.add(body);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.9), underMat);
        belly.position.set(0, 0.5, 0);
        group.add(belly);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.5), shadowMat);
        head.position.set(0, 0.85, 0.75);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.3), shadowMat);
        snout.position.set(0, 0.76, 1.05);
        group.add(snout);

        // Pointed Ears
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), earMat);
        earL.position.set(-0.18, 1.15, 0.65);
        group.add(earL);

        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), earMat);
        earR.position.set(0.18, 1.15, 0.65);
        group.add(earR);

        // Glowing Cyan Eyes
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), eyeMat);
        eyeL.position.set(-0.14, 0.95, 1.0);
        group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), eyeMat);
        eyeR.position.set(0.14, 0.95, 1.0);
        group.add(eyeR);

        // Tail
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), shadowMat);
        tail.position.set(0, 0.7, -0.8);
        tail.rotation.x = -0.5;
        group.add(tail);

        // 4 Muscular Legs
        const legGeom = new THREE.BoxGeometry(0.2, 0.55, 0.2);
        this.animParts.legFL = new THREE.Mesh(legGeom, shadowMat);
        this.animParts.legFL.position.set(-0.28, 0.28, 0.4);
        group.add(this.animParts.legFL);

        this.animParts.legFR = new THREE.Mesh(legGeom, shadowMat);
        this.animParts.legFR.position.set(0.28, 0.28, 0.4);
        group.add(this.animParts.legFR);

        this.animParts.legBL = new THREE.Mesh(legGeom, shadowMat);
        this.animParts.legBL.position.set(-0.28, 0.28, -0.4);
        group.add(this.animParts.legBL);

        this.animParts.legBR = new THREE.Mesh(legGeom, shadowMat);
        this.animParts.legBR.position.set(0.28, 0.28, -0.4);
        group.add(this.animParts.legBR);
        break;
      }
    }

    return group;
  }

  update(delta, playerPos) {
    super.update(delta);

    if (this.isDead) return;

    // AI Tick
    if (this.ai) {
      this.ai.update(delta, playerPos);
    }

    // Walking / Flying Animation Cycles
    this.animTimer += delta * 8.0;
    const isMoving = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z > 0.1;

    if (this.animParts.wingL && this.animParts.wingR) {
      // Sky Bird Wing Flap
      const flap = Math.sin(this.animTimer * 1.8) * 0.7;
      this.animParts.wingL.rotation.z = flap;
      this.animParts.wingR.rotation.z = -flap;
    } else if (this.animParts.legFL) {
      // Quadruped Leg Walk Cycle
      if (isMoving) {
        const swing = Math.sin(this.animTimer) * 0.6;
        this.animParts.legFL.rotation.x = swing;
        this.animParts.legBR.rotation.x = swing;
        this.animParts.legFR.rotation.x = -swing;
        this.animParts.legBL.rotation.x = -swing;
      } else {
        this.animParts.legFL.rotation.x = 0;
        this.animParts.legFR.rotation.x = 0;
        this.animParts.legBL.rotation.x = 0;
        this.animParts.legBR.rotation.x = 0;
      }
    }
  }

  takeDamage(amount, knockbackVec = null, source = null) {
    const res = super.takeDamage(amount, knockbackVec, source);
    if (res && this.ai) {
      const attackerPos = source && source.position ? source.position : null;
      this.ai.onDamaged(attackerPos);
    }
    return res;
  }

  getDrops() {
    return MobDropTable.getDrops(this.mobType);
  }

  dispose() {
    if (this.scene && this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
    }
  }
}
