// Panel 2 — Live log streamer
// Tails express/logs/access.log (JSON telemetry) and adds pg/convex status lines

const fs     = require('fs');
const path   = require('path');
const { spawn } = require('child_process');
const state  = require('../state');
const config = require('../config');

const MAX_LOGS = 300;

/**
 * Add a log entry to shared state.
 * source: 'express' | 'postgres' | 'convex' | 'system'
 * level:  'info' | 'warn' | 'error'
 */
function addLog(source, level, msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  state.logs.unshift({ time, source, level, msg: String(msg) });
  if (state.logs.length > MAX_LOGS) state.logs.pop();
}

function startTailing() {
  const logPath = path.join(config.projectRoot, 'express', 'logs', 'access.log');

  // Ensure dir + file exist so the tailer doesn't immediately die
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '');

  addLog('system', 'info', `Tailing: ${logPath}`);

  let child;
  if (config.isWin) {
    child = spawn('powershell', [
      '-NoProfile', '-Command',
      `Get-Content -Path "${logPath}" -Wait -Tail 0`,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
  } else {
    child = spawn('tail', ['-f', '-n', '0', logPath], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  }

  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop(); // keep incomplete last line
    for (const line of lines) parseLine(line.trim());
  });

  child.on('exit', () => addLog('system', 'warn', 'Log tailer exited — restarting in 3s'));
  child.on('error', e => addLog('system', 'error', `Tailer error: ${e.message}`));
}

function parseLine(line) {
  if (!line) return;
  try {
    const data = JSON.parse(line);
    const isInternal = data.reason && data.reason.includes('OZ-Monitor');

    // Feed to metrics panel
    const metrics = require('../panel3/metrics');
    metrics.record(data, isInternal);

    if (!isInternal) {
      const status = parseInt(data.status, 10);
      const level  = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      addLog('express', level, `${data.method} ${data.path} ${status} ${parseFloat(data.latency).toFixed(1)}ms`);
    }
  } catch (_) {
    if (line.length > 2) addLog('express', 'info', line.substring(0, 100));
  }
}

module.exports = { startTailing, addLog };
