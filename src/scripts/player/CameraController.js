import * as THREE from 'three';

/**
 * First-person PointerLock Camera Controller
 */
export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.pitch = 0; // Up/down in radians
    this.yaw = 0;   // Left/right in radians
    this.sensitivity = 0.0022;

    this.isLocked = false;
    this._onLockChange = null;

    this._bindEvents();
  }

  setLockChangeCallback(cb) {
    this._onLockChange = cb;
  }

  _bindEvents() {
    if (typeof document === 'undefined') return;

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = !!document.pointerLockElement;
      if (this._onLockChange) {
        this._onLockChange(this.isLocked);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
      const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

      this.yaw -= movementX * this.sensitivity;
      this.pitch -= movementY * this.sensitivity;

      // Clamp pitch to avoid screen flipping
      const maxPitch = Math.PI / 2 - 0.02;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });
  }

  lock() {
    if (!this.isLocked) {
      try {
        if (this.domElement && this.domElement.requestPointerLock) {
          const promise = this.domElement.requestPointerLock();
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        } else if (document.body && document.body.requestPointerLock) {
          const promise = document.body.requestPointerLock();
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        }
      } catch (err) {
        // Silently handle any browser security restrictions until user clicks
      }
    }
  }

  unlock() {
    this.isLocked = false;
    try {
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch (err) {}
  }

  update(playerPos, eyeHeight) {
    // Set camera position to player eye position
    this.camera.position.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);

    // Apply rotation (order: YXZ)
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return forward.normalize();
  }

  getRightVector() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return right.normalize();
  }

  getLookDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
