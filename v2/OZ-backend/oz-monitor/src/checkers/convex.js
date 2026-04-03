const http = require('http');
const https = require('https');
const state = require('../state');
const utils = require('../utils');
const config = require('../config');
const Logger = require('../core/logger');
const Alerter = require('../core/alerter');
const chalk = require('chalk');

class ConvexChecker {
  static async execute() {
    const s = state.services.convex;
    let isOk = false;
    let details = '';

    try {
      // Valid Level 1: API HTTP & Body Match Check
      const apiRes = await this.checkHTTP();
      if (apiRes.ok) {
        isOk = true;
        details = `HTTP ${apiRes.latency}ms │ TEXT MATCH OK`;
      } else {
        details = `HTTP FAILED (${apiRes.code})`;
      }
    } catch(e) {
      details = `Error: ${e.message}`;
    }

    // Valid Level 3: Threshold and Flapping evaluation
    this.evaluateState(s, isOk, details);
  }

  static checkHTTP(timeout = 2000) {
    return new Promise(resolve => {
      const startTime = Date.now();
      const url = new URL(config.convex.url);
      const mod = url.protocol === 'https:' ? https : http;
      
      const req = mod.request({ 
        hostname: url.hostname, 
        port: url.port || (url.protocol==='https:'?443:80), 
        path: '/', 
        method: 'GET', 
        timeout,
        headers: { 'User-Agent': 'OZ-Monitor/v3' }
      },
        res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const latency = Date.now() - startTime;
            const hasText = body.includes('This Convex deployment is running. See https://docs.convex.dev/');
            const ok = res.statusCode >= 200 && res.statusCode < 500 && hasText;
            resolve({ ok, code: hasText ? res.statusCode : 'BODY MISMATCH', latency });
          });
        }
      );
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 'TIMEOUT' }); });
      req.on('error', (e) => resolve({ ok: false, code: e.message }));
      req.end();
    });
  }

  static evaluateState(s, isOk, details) {
    if (isOk) {
      if (s.status === 'OFFLINE') Logger.log(chalk.green(`[Convex] ✔ Back online`));
      s.status = 'ONLINE';
      s.consecutiveFails = 0;
      s.last = Date.now();
      s.detail = details;
    } else {
      s.consecutiveFails++;
      s.detail = chalk.redBright(`FAIL [${s.consecutiveFails}/${config.convex.maxThreshold}] `) + details;
      
      if (s.consecutiveFails >= config.convex.maxThreshold && s.status !== 'OFFLINE') {
        s.status = 'OFFLINE';
        s.since = Date.now();
        s.drops.push(Date.now());
        s.errors++;
        
        Alerter.triggerDowntimeAlert('Convex', details);
        Logger.log(chalk.red('[Convex] ✖ OFFLINE — Threshold reached. Attempting background container rebuild...'));
        
        if (!s.suspended && !s.retrying) {
          this.heal();
        }
      }
    }
  }

  static async heal() {
    const s = state.services.convex;
    s.retrying = true; // Use retrying flag for ui rebuild matching
    s.restarts++;
    
    Logger.log(chalk.gray('[Convex Heal] Tearing down containers...'));
    await utils.runCmdAsync('docker compose down', 'convex');
    
    Logger.log(chalk.gray('[Convex Heal] Recreating containers...'));
    await utils.runCmdAsync('docker compose up -d', 'convex');
    
    Alerter.triggerHealAlert('Convex');
    s.retrying = false;
  }
}

module.exports = ConvexChecker;
