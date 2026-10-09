import { spawn } from 'child_process';

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
  let chromeProc = null;
  const alreadyRunning = await waitForPort(9222, 1000);
  if (!alreadyRunning) {
    console.log('🚀 Launching Headless Chrome on CDP port 9222...');
    chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'http://localhost:5173/',
    ]);
    const isReady = await waitForPort(9222, 10000);
    if (!isReady) {
      console.error('❌ Chrome failed to start on port 9222');
      if (chromeProc) chromeProc.kill();
      process.exit(1);
    }
  }

  console.log('✅ Chrome CDP ready. Running V8.5 Shaft Verification...');

  try {
    const { testV85BrowserShaft } = await import('./test_v85_browser_shaft.js');
    await testV85BrowserShaft();
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    if (chromeProc) {
      console.log('🧹 Closing headless Chrome...');
      chromeProc.kill();
    }
  }
}

run();
