// OZ Monitor v2 — Main entry point
// Boot order: logStreamer → serviceChecker → keyboard → render loop

require('dotenv').config();

const { startTailing, addLog } = require('./panel2/logStreamer');
const { checkAll }             = require('./panel1/serviceChecker');
const metrics                  = require('./panel3/metrics');
const { render }               = require('./renderer');
const Alerter                  = require('./core/alerter'); // keep existing alerter
const state                    = require('./state');

// ── Keyboard handler ───────────────────────────────────────────────────────
function setupKeyboard() {
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', key => {
    // Quit
    if (key === '\u0003' || key.toLowerCase() === 'q') {
      cleanup();
      return;
    }

    // Scroll logs — up arrow
    if (key === '\u001b[A' || key === '\u001bOA') {
      state.logScroll = Math.min(Math.max(0, state.logs.length - 1), state.logScroll + 1);
      render();
      return;
    }
    // Scroll logs — down arrow
    if (key === '\u001b[B' || key === '\u001bOB') {
      state.logScroll = Math.max(0, state.logScroll - 1);
      render();
      return;
    }

    // Pause / resume
    if (key.toLowerCase() === 'p') {
      state.paused = !state.paused;
      addLog('system', 'warn', state.paused ? 'Monitor PAUSED' : 'Monitor RESUMED');
      render();
      return;
    }

    // Clear logs
    if (key.toLowerCase() === 'c') {
      state.logs = [];
      state.logScroll = 0;
      render();
      return;
    }

    // Manual test alert
    if (key === '6') {
      addLog('system', 'warn', 'Dispatching manual test alert email...');
      Alerter.triggerManualTestEmail();
      render();
      return;
    }
  });
}

// ── Main tick (1 second) ───────────────────────────────────────────────────
async function tick() {
  metrics.tick();          // Compute RPS for this second
  await checkAll();        // Health-check all services
  render();                // Redraw all 3 panels
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function playBootAnimation() {
  const logo = `
   ____          _          _____             
  / __ \\        | |        |___  /            
 | |  | |  _ __ | |  _ __     / /   __ _|  _ \\ 
 | |  | | | '__|| | / _\` |   / /   / _\` | |_) |
 | |__| | | |   | || (_| |  / /__ | (_| |  __/
  \\____/  |_|   |_| \\__,_| /_____| \\__,_|_|   
`;
  const spin = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  for (let i = 0; i < 25; i++) {
    process.stdout.write('\x1B[2J\x1B[H');
    const color = `\x1b[3${(i%6)+1}m`; // rotate colors
    console.log(`${color}${logo}\x1b[0m`);
    console.log(`\n\x1b[36m   ${spin[i % spin.length]} Initializing OZ Monitor\x1b[0m\n`);
    await sleep(80);
  }

  process.stdout.write('\x1B[2J\x1B[H');
  console.log(`\x1b[32m${logo}\x1b[0m`);
  console.log(`\n\x1b[32m   ✔ SYSTEM ONLINE. Launching Dashboard...\x1b[0m\n`);
  await sleep(1000);
}

const { spawn } = require('child_process');
const path = require('path');

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  process.stdout.write('\x1B[?25l');  // Hide cursor
  await playBootAnimation();

  console.log(`\n\x1b[36m   Waiting for Local Infrastructure (Express, PostgreSQL) to initialize...\x1b[0m\n`);
  
  // Wait up to 30s for the self-healer to boot everything automatically
  let attempts = 0;
  while(attempts < 30) {
    await checkAll();
    if (state.services.express.status === 'UP' && state.services.postgres.status === 'UP') {
      break;
    }
    await sleep(1000);
    attempts++;
  }

  console.log(`\n\x1b[36m   Infrastructure is ONLINE. Engaging Full Route & Sync Validation...\x1b[0m\n`);
  
  // Run the test suite natively
  await new Promise(resolve => {
    const testDir = path.resolve(__dirname, '../../express');
    const child = spawn('npx tsx src/tests/fullRouteTest.ts --max-retries=2', {
      cwd: testDir,
      stdio: 'inherit',
      shell: true
    });
    child.on('exit', () => resolve());
  });

  console.log(`\n\x1b[32m   Validation check completed. Launching live dashboard...\x1b[0m\n`);
  await sleep(2000);

  process.stdout.write('\x1B[2J\x1B[H'); // Clear screen for dashboard

  startTailing();           // Panel 2: start tailing access.log
  setupKeyboard();

  // Redraw on terminal resize
  process.stdout.on('resize', render);

  // First tick immediately, then every 1s
  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), 1000);

  addLog('system', 'info', 'OZ Monitor v2 started — 3 panels active');
  render();
}

// ── Cleanup ────────────────────────────────────────────────────────────────
function cleanup() {
  process.stdout.write('\x1B[?25h');   // Show cursor
  logUpdateClear();
  try { require('./panel1/selfHealer').cleanup(); } catch (_) {}
  process.stdout.write('\x1B[2J\x1B[H');
  console.log('\n  OZ Monitor closed. Goodbye!\n');
  process.exit(0);
}

// Lazy import to avoid circular at cleanup time
function logUpdateClear() {
  try { require('log-update').clear(); } catch (_) {}
}

process.on('SIGINT',  () => { logUpdateClear(); try{require('./panel1/selfHealer').cleanup();}catch(_){} process.stdout.write('\x1B[?25h\n'); process.exit(0); });
process.on('SIGTERM', () => { logUpdateClear(); try{require('./panel1/selfHealer').cleanup();}catch(_){} process.stdout.write('\x1B[?25h\n'); process.exit(0); });

boot();
