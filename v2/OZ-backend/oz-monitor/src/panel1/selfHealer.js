// Panel 1 — Self-healer
// Kills and respawns services when the checker marks them OFFLINE

const { spawn } = require('child_process');
const path      = require('path');
const state     = require('../state');
const config    = require('../config');
const { addLog } = require('../panel2/logStreamer');

let expressProcess = null;
let expressPid     = null;
let expressHealing = false;

const SelfHealer = {
  healExpress() {
    if (expressHealing) return;
    expressHealing = true;

    const svc = state.services.express;
    svc.status = 'HEALING';
    svc.restarts++;

    // Kill old process if alive
    if (expressPid) {
      try { process.kill(expressPid, 'SIGKILL'); } catch (_) {}
      expressPid = null;
      expressProcess = null;
    }

    const expressDir = path.resolve(config.projectRoot, 'express');
    addLog('express', 'warn', `Self-heal #${svc.restarts}: spawning npm start in express/`);

    const child = spawn('npm', ['start'], {
      cwd:   expressDir,
      stdio: 'ignore',
      shell: true,
      env:   { ...process.env, PORT: String(config.express.port) },
    });

    expressProcess = child;
    expressPid     = child.pid;

    child.on('exit', code => {
      if (expressPid === child.pid) {
        addLog('express', 'warn', `Process exited with code ${code}`);
        expressPid     = null;
        expressProcess = null;
      }
    });

    // Allow 5 s before another heal attempt
    setTimeout(() => { expressHealing = false; }, 5000);
  },

  healPostgres() {
    const svc = state.services.postgres;
    svc.status = 'HEALING';
    svc.restarts++;
    addLog('postgres', 'warn', `Self-heal #${svc.restarts}: restarting PostgreSQL service`);

    // Try common Windows service names
    const names = ['postgresql-x64-18', 'postgresql-x64-17', 'postgresql-x64-16', 'postgresql'];
    let attempted = false;

    for (const name of names) {
      const child = spawn('net', ['start', name], {
        stdio: 'ignore',
        shell: true,
      });
      child.on('exit', code => {
        if (code === 0 && !attempted) {
          attempted = true;
          addLog('postgres', 'info', `Service '${name}' start command succeeded`);
        }
      });
      if (!attempted) break; // fire one attempt
    }
  },

  healConvex() {
    // Convex is managed externally — just alert the user
    const svc = state.services.convex;
    svc.restarts++;
    addLog('convex', 'warn', `Convex is DOWN — run: npx convex dev  (restart #${svc.restarts})`);
  },

  cleanup() {
    if (expressPid) {
      try { process.kill(expressPid, 'SIGKILL'); } catch (_) {}
    }
  }
};

module.exports = SelfHealer;
