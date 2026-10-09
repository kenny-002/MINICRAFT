import { spawn } from 'child_process';
import http from 'http';

async function waitForPort(port, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function run() {
  console.log('🚀 Launching Headless Chrome on CDP port 9222...');
  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://localhost:5173/',
  ]);

  chromeProc.stderr.on('data', d => {});

  const isReady = await waitForPort(9222, 10000);
  if (!isReady) {
    console.error('❌ Chrome failed to start on port 9222');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('✅ Chrome CDP ready. Running V6.2 Verification...');

  try {
    const { testV62BlockDrops } = await import('./test_v62_block_drops.js');
    await testV62BlockDrops();
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Closing headless Chrome...');
    chromeProc.kill();
  }
}

run();
