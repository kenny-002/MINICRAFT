import * as THREE from 'three';
import { DayNightCycle } from './src/scripts/environment/DayNightCycle.js';

console.log('🧪 RUNNING BLOCKWORLD LIGHTING & DAY/NIGHT VERIFICATION SUITE...\n');

const scene = new THREE.Scene();
const cycle = new DayNightCycle(scene);

const testPoints = [
  { name: 'Midnight', time: 0.0, expectNight: true },
  { name: 'Dawn / Sunrise', time: 0.25, expectNight: false },
  { name: 'Noon', time: 0.50, expectNight: false },
  { name: 'Dusk / Sunset', time: 0.75, expectNight: false },
];

let passed = 0;
let total = 0;

function assert(condition, desc) {
  total++;
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${desc}`);
  }
}

for (const tp of testPoints) {
  console.log(`\n--- Testing ${tp.name} (timeOfDay = ${tp.time}) ---`);
  cycle.setTimeOfDay(tp.time);

  const sunInt = cycle.sunLight.intensity;
  const moonInt = cycle.moonLight.intensity;
  const ambInt = cycle.ambientLight.intensity;
  const hemiInt = cycle.hemiLight.intensity;
  const skyCol = scene.background;

  console.log(`  Sun Light: ${sunInt.toFixed(2)} | Moon Light: ${moonInt.toFixed(2)}`);
  console.log(`  Ambient: ${ambInt.toFixed(2)} | Hemi: ${hemiInt.toFixed(2)}`);
  console.log(`  Sky Color: #${skyCol.getHexString()} (R: ${skyCol.r.toFixed(2)}, G: ${skyCol.g.toFixed(2)}, B: ${skyCol.b.toFixed(2)})`);

  if (tp.name === 'Midnight') {
    assert(ambInt >= 0.38 && ambInt <= 0.50, `Night ambient intensity in range [0.38, 0.50] (actual: ${ambInt.toFixed(2)})`);
    assert(moonInt >= 0.30 && moonInt <= 0.45, `Night moon fill light in range [0.30, 0.45] (actual: ${moonInt.toFixed(2)})`);
    assert(skyCol.getHexString() === '324b74' || (skyCol.r > 0.02 && skyCol.b > 0.10), `Night sky is rich blue-gray, not pitch black (Hex: #${skyCol.getHexString()})`);
    assert(ambInt + hemiInt + moonInt >= 1.0, `Total midnight illumination is clearly visible (actual: ${(ambInt + hemiInt + moonInt).toFixed(2)})`);
  }

  if (tp.name === 'Noon') {
    assert(sunInt >= 1.0 && sunInt <= 1.35, `Noon sun light is bright and crisp (actual: ${sunInt.toFixed(2)})`);
    assert(ambInt >= 0.75 && ambInt <= 0.95, `Noon ambient illumination is bright (actual: ${ambInt.toFixed(2)})`);
    assert(moonInt === 0, `Moon light is 0 during daytime`);
    assert(skyCol.b >= 0.8, `Daytime sky is vibrant blue`);
  }
}

console.log(`\n--- Testing Smooth Transitions Across 100 Samples ---`);
let allValid = true;
for (let i = 0; i < 100; i++) {
  const t = i / 100;
  cycle.setTimeOfDay(t);
  if (cycle.ambientLight.intensity < 0.38) {
    allValid = false;
    console.error(`Ambient light dropped below minimum floor 0.38 at t=${t.toFixed(2)}: ${cycle.ambientLight.intensity}`);
  }
}
assert(allValid, 'Ambient illumination never drops below 0.38 across the entire 24-hour cycle');

console.log(`\n🎉 LIGHTING VERIFICATION COMPLETE: ${passed}/${total} assertions passed!\n`);
if (passed !== total) {
  process.exit(1);
}
