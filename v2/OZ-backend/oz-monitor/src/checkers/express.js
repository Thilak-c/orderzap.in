const net = require('net');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const path = require('path');
const state = require('../state');
const utils = require('../utils');
const config = require('../config');
const Logger = require('../core/logger');
const Alerter = require('../core/alerter');
const chalk = require('chalk');

class ExpressChecker {
  static async execute() {
    const s = state.services.express;
    let isOk = false;
    let details = '';

    try {
      // Valid Level 1: TCP
      const tcpUp = await this.checkTCP(config.express.host, config.express.port);
      
      if (!tcpUp) {
        details = `TCP connection refused on ${config.express.port}`;
      } else {
        // Valid Level 2: API HTTP Check
        const apiRes = await this.checkAPI();
        if (apiRes.ok) {
          isOk = true;
          details = `TCP ${config.express.port} │ HTTP ${apiRes.latency}ms`;
        } else {
          details = `TCP OK │ HTTP FAILED (${apiRes.code})`;
        }
      }
    } catch(e) {
      details = `Error: ${e.message}`;
    }

    // Valid Level 3: Threshold and Flapping evaluation
    this.evaluateState(s, isOk, details);
  }

  static checkTCP(host, port, timeout = 2000) {
    return new Promise(resolve => {
      const sock = new net.Socket();
      sock.setTimeout(timeout);
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.connect(port, host);
    });
  }

  static checkAPI(timeout = 2000) {
    return new Promise(resolve => {
      const startTime = Date.now();
      const url = new URL(config.express.healthUrl);
      const mod = url.protocol === 'https:' ? https : http;
      
      const req = mod.request({ 
        hostname: url.hostname, 
        port: url.port || (url.protocol==='https:'?443:80), 
        path: url.pathname, 
        method: 'GET', 
        timeout,
        headers: { 'User-Agent': 'OZ-Monitor/v3' }
      },
        res => {
          const latency = Date.now() - startTime;
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, code: res.statusCode, latency });
        }
      );
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 'TIMEOUT' }); });
      req.on('error', (e) => resolve({ ok: false, code: e.message }));
      req.end();
    });
  }

  static evaluateState(s, isOk, details) {
    if (isOk) {
      if (s.status === 'OFFLINE') Logger.log(chalk.green(`[Express] ✔ Back online`));
      s.status = 'ONLINE';
      s.consecutiveFails = 0;
      s.last = Date.now();
      s.detail = details;
    } else {
      s.consecutiveFails++;
      s.detail = chalk.redBright(`FAIL [${s.consecutiveFails}/${config.express.maxThreshold}] `) + details;
      
      if (s.consecutiveFails >= config.express.maxThreshold && s.status !== 'OFFLINE') {
        s.status = 'OFFLINE';
        s.since = Date.now();
        s.drops.push(Date.now());
        s.errors++;
        
        Alerter.triggerDowntimeAlert('Express API', details);
        Logger.log(chalk.red('[Express] ✖ OFFLINE — Starting background recovery...'));
        
        if (!s.suspended && !s.retrying) {
          this.heal();
        }
      }
    }
  }

  static async heal() {
    const s = state.services.express;
    s.retrying = true;
    s.restarts++;

    // 1. Terminate old process if exists
    if (s.process) {
      Logger.log(chalk.gray('[Express Heal] Terminating existing PID: ' + s.pid));
      try {
        process.kill(s.pid, 'SIGKILL');
      } catch(e) {}
      s.process = null;
      s.pid = null;
    }

    // 2. Spawn new process
    const expressDir = path.resolve(config.projectRoot, 'express');
    Logger.log(chalk.gray(`[Express Heal] Spawning 'npm start' in: ${expressDir}`));

    const child = spawn('npm', ['start'], {
      cwd: expressDir,
      stdio: 'ignore', // Monitor handles traffic via file logs
      shell: true,
      env: { ...process.env, PORT: config.express.port }
    });

    s.process = child;
    s.pid = child.pid;

    child.on('exit', (code) => {
      if (s.pid === child.pid) { // Only handle if it's the current one
        Logger.log(chalk.red(`[Express Process] Exited with code: ${code}`));
        s.pid = null;
        s.process = null;
      }
    });

    await new Promise(r => setTimeout(r, 2000)); // Allow boot time

    Alerter.triggerHealAlert('Express API');
    s.retrying = false;
  }
}

module.exports = ExpressChecker;
