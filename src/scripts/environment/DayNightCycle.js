import * as THREE from 'three';

/**
 * Dynamic Day/Night Cycle with synchronized Sun & Moon directional lighting,
 * balanced ambient & hemisphere illumination, and smooth atmospheric sky/fog transitions.
 * Guarantees crisp daytime clarity and rich, clearly visible nighttime exploration.
 */
export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;

    // Cycle parameters
    this.dayDuration = 180; // Seconds per full day (3 minutes)
    this.timeOfDay = 0.25; // 0.0 = midnight, 0.25 = sunrise/morning, 0.5 = noon, 0.75 = sunset, 1.0 = midnight

    // 1. Sun Directional Light (Warm daytime illumination & shadows)
    this.sunLight = new THREE.DirectionalLight(0xfff8e7, 1.25);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // 2. Moon Directional Light (Cool blue nighttime fill & terrain relief)
    this.moonLight = new THREE.DirectionalLight(0x99bbff, 0.38);
    this.moonLight.position.set(-50, 100, -50);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);

    // 3. Omnidirectional Ambient Light (Base illumination ensuring no pitch-black surfaces)
    this.ambientLight = new THREE.AmbientLight(0xddeeff, 0.80);
    this.scene.add(this.ambientLight);

    // 4. Hemisphere Light (Sky-to-ground natural bounce & ambient occlusion depth)
    this.hemiLight = new THREE.HemisphereLight(0xd4ecff, 0x6b7a5a, 0.45);
    this.scene.add(this.hemiLight);

    // 5. Atmospheric Fog (Soft horizon blending without obscuring near/mid terrain)
    this.scene.fog = new THREE.FogExp2(0x78bce8, 0.0075);

    // Color definitions for smooth celestial lerping with neutral baseline for true texture fidelity
    this.skyDay = new THREE.Color(0x78bce8);
    this.skySunset = new THREE.Color(0xeb7a38);
    this.skyDusk = new THREE.Color(0x4a3b68);
    this.skyNight = new THREE.Color(0x1e2838);

    this.sunDayColor = new THREE.Color(0xfffaed);
    this.sunSunsetColor = new THREE.Color(0xff8833);

    this.ambientDayColor = new THREE.Color(0xffffff);
    this.ambientSunsetColor = new THREE.Color(0xffeedd);
    this.ambientNightColor = new THREE.Color(0xb8c2d1); // Balanced neutral moonlight

    this.hemiSkyDay = new THREE.Color(0xffffff);
    this.hemiGroundDay = new THREE.Color(0x999999);
    this.hemiSkySunset = new THREE.Color(0xffaa77);
    this.hemiGroundSunset = new THREE.Color(0x665544);
    this.hemiSkyNight = new THREE.Color(0x8c99a8);
    this.hemiGroundNight = new THREE.Color(0x5a606a);

    // Run initial lighting update so scene background and lighting are applied immediately
    this.update(0);
  }

  update(delta) {
    // Advance time
    this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1.0;

    // Phase angle so 0.0 = midnight (sun at nadir -1), 0.25 = sunrise (sun at 0), 0.5 = noon (sun at zenith +1), 0.75 = sunset (sun at 0)
    const angle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const celestialDist = 140;

    // Orbit Sun across the sky (East to West)
    const sunX = -Math.cos(angle) * celestialDist;
    const sunY = Math.sin(angle) * celestialDist;
    const sunZ = Math.cos(angle * 0.5) * (celestialDist * 0.35);

    this.sunLight.position.set(sunX, sunY, sunZ);

    // Orbit Moon diametrically opposite to Sun
    const moonX = -sunX;
    const moonY = Math.max(20, -sunY); // Keep moon at healthy fill angle overhead when active
    const moonZ = -sunZ;

    this.moonLight.position.set(moonX, moonY, moonZ);

    // Sun altitude: -1.0 (midnight) to +1.0 (noon)
    const sunAltitude = Math.sin(angle);

    let currentSunIntensity = 0;
    let currentMoonIntensity = 0;
    let currentAmbientIntensity = 0.42;
    let currentHemiIntensity = 0.30;

    const skyColor = new THREE.Color();
    const sunColor = new THREE.Color();
    const ambientColor = new THREE.Color();
    const hemiSky = new THREE.Color();
    const hemiGround = new THREE.Color();

    if (sunAltitude > 0.18) {
      // --- FULL DAYTIME ---
      const t = Math.min(1.0, (sunAltitude - 0.18) / 0.82);
      currentSunIntensity = 1.05 + t * 0.25; // 1.05 to 1.30
      currentMoonIntensity = 0.0;
      currentAmbientIntensity = 0.78 + t * 0.10; // 0.78 to 0.88
      currentHemiIntensity = 0.40 + t * 0.10; // 0.40 to 0.50

      skyColor.copy(this.skyDay);
      sunColor.copy(this.sunDayColor);
      ambientColor.copy(this.ambientDayColor);
      hemiSky.copy(this.hemiSkyDay);
      hemiGround.copy(this.hemiGroundDay);
    } else if (sunAltitude > -0.15) {
      // --- SUNRISE / SUNSET TRANSITION ---
      // t: 0.0 (night boundary) -> 1.0 (day boundary)
      const t = (sunAltitude + 0.15) / 0.33;

      currentSunIntensity = t * 1.05;
      currentMoonIntensity = (1.0 - t) * 0.35;
      currentAmbientIntensity = 0.48 + t * 0.30; // 0.48 to 0.78
      currentHemiIntensity = 0.30 + t * 0.10;

      if (t > 0.5) {
        // Upper transition (Sunset to Day)
        const subT = (t - 0.5) * 2.0;
        skyColor.lerpColors(this.skySunset, this.skyDay, subT);
        sunColor.lerpColors(this.sunSunsetColor, this.sunDayColor, subT);
        ambientColor.lerpColors(this.ambientSunsetColor, this.ambientDayColor, subT);
        hemiSky.lerpColors(this.hemiSkySunset, this.hemiSkyDay, subT);
        hemiGround.lerpColors(this.hemiGroundSunset, this.hemiGroundDay, subT);
      } else {
        // Lower transition (Night/Dusk to Sunset)
        const subT = t * 2.0;
        skyColor.lerpColors(this.skyNight, this.skySunset, subT);
        sunColor.copy(this.sunSunsetColor);
        ambientColor.lerpColors(this.ambientNightColor, this.ambientSunsetColor, subT);
        hemiSky.lerpColors(this.hemiSkyNight, this.hemiSkySunset, subT);
        hemiGround.lerpColors(this.hemiGroundNight, this.hemiGroundSunset, subT);
      }
    } else {
      // --- NIGHTTIME (Clearly visible, vibrant colors, soft moonlight) ---
      const nightDepth = Math.min(1.0, Math.abs(sunAltitude + 0.15) / 0.85);

      currentSunIntensity = 0.0;
      currentMoonIntensity = 0.35 + nightDepth * 0.08; // 0.35 to 0.43 directional moonlight
      currentAmbientIntensity = 0.42 + nightDepth * 0.04; // 0.42 to 0.46 ambient floor (never dark black)
      currentHemiIntensity = 0.28 + nightDepth * 0.04; // 0.28 to 0.32

      skyColor.copy(this.skyNight);
      ambientColor.copy(this.ambientNightColor);
      hemiSky.copy(this.hemiSkyNight);
      hemiGround.copy(this.hemiGroundNight);
    }

    // Apply lighting intensities & colors
    this.sunLight.intensity = currentSunIntensity;
    this.sunLight.color.copy(sunColor);

    this.moonLight.intensity = currentMoonIntensity;

    this.ambientLight.intensity = currentAmbientIntensity;
    this.ambientLight.color.copy(ambientColor);

    this.hemiLight.intensity = currentHemiIntensity;
    this.hemiLight.color.copy(hemiSky);
    this.hemiLight.groundColor.copy(hemiGround);

    // Update scene background and fog
    this.scene.background = skyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
    }
  }

  isNight() {
    // True when sun is below horizon
    return this.timeOfDay < 0.20 || this.timeOfDay > 0.80;
  }

  setTimeOfDay(val) {
    this.timeOfDay = Math.max(0, Math.min(1.0, val));
    this.update(0);
  }

  getTimeFormatted() {
    // 0.0 = 00:00 (midnight), 0.25 = 06:00 (dawn), 0.5 = 12:00 (noon), 0.75 = 18:00 (dusk)
    const totalHours = this.timeOfDay * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${pad(hours)}:${pad(minutes)}`;
  }
}
