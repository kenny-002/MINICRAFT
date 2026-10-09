/**
 * Settings and Preferences System for MINICRAFT.
 * Handles Master Volume, Mouse Sensitivity, FOV, Graphics Quality, and Fullscreen.
 * Persists preferences in localStorage.
 */
export class SettingsSystem {
  static STORAGE_KEY = 'minicraft_settings_v1';

  static DEFAULT_SETTINGS = {
    masterVolume: 80,       // 0 to 100
    sensitivity: 1.0,       // 0.5 to 2.5
    fov: 75,                // 60 to 95
    renderDistance: 6,      // 4 to 12
    graphicsQuality: 'fancy', // 'fancy' or 'fast'
    fullscreen: false,
  };

  constructor(game) {
    this.game = game;
    this.settings = { ...SettingsSystem.DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SettingsSystem.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...SettingsSystem.DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
      this.settings = { ...SettingsSystem.DEFAULT_SETTINGS };
    }
    this.apply();
  }

  save() {
    try {
      localStorage.setItem(SettingsSystem.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  apply() {
    if (!this.game) return;

    // 1. Audio Master Volume
    if (this.game.sound) {
      this.game.sound.masterVolume = this.settings.masterVolume / 100;
      if (typeof this.game.sound.setMasterVolume === 'function') {
        this.game.sound.setMasterVolume(this.settings.masterVolume / 100);
      }
    }

    // 2. Camera FOV
    if (this.game.camera) {
      this.game.camera.fov = this.settings.fov;
      this.game.camera.updateProjectionMatrix();
    }

    // 3. Mouse Sensitivity
    if (this.game.player && this.game.player.cameraController) {
      this.game.player.cameraController.sensitivity = 0.002 * this.settings.sensitivity;
    }

    // 4. World Render Distance
    if (this.game.world && typeof this.game.world.chunkRadius !== 'undefined') {
      this.game.world.chunkRadius = this.settings.renderDistance;
    }
  }

  setMasterVolume(val) {
    this.settings.masterVolume = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    this.apply();
    this.save();
  }

  setSensitivity(val) {
    this.settings.sensitivity = Math.max(0.4, Math.min(2.5, parseFloat(val) || 1.0));
    this.apply();
    this.save();
  }

  setFov(val) {
    this.settings.fov = Math.max(60, Math.min(95, parseInt(val, 10) || 75));
    this.apply();
    this.save();
  }

  setRenderDistance(val) {
    this.settings.renderDistance = Math.max(4, Math.min(12, parseInt(val, 10) || 6));
    this.apply();
    this.save();
  }

  toggleGraphicsQuality() {
    this.settings.graphicsQuality = this.settings.graphicsQuality === 'fancy' ? 'fast' : 'fancy';
    this.apply();
    this.save();
    return this.settings.graphicsQuality;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.settings.fullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.settings.fullscreen = false;
    }
    this.save();
  }
}
