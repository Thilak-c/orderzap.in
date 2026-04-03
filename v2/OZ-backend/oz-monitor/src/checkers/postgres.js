const net = require('net');

const state = require('../state');
const utils = require('../utils');
const config = require('../config');
const Logger = require('../core/logger');
const Alerter = require('../core/alerter');
const chalk = require('chalk');

class PostgresChecker {
  static async execute() {
    const s = state.services.postgres;
    let isOk = false;
    let details = '';

    try {
      // Valid Level 1: TCP
      const tcpUp = await this.checkTCP(config.postgres.host, config.postgres.port);
      
      if (!tcpUp) {
        details = `TCP connection refused on ${config.postgres.port}`;
      } else {
        isOk = true;
        details = `TCP ${config.postgres.port} │ OK`;
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



  static evaluateState(s, isOk, details) {
    if (isOk) {
      if (s.status === 'OFFLINE') Logger.log(chalk.green(`[Postgres] ✔ Back online`));
      s.status = 'ONLINE';
      s.consecutiveFails = 0;
      s.last = Date.now();
      s.detail = details;
    } else {
      s.consecutiveFails++;
      s.detail = chalk.redBright(`FAIL [${s.consecutiveFails}/${config.postgres.maxThreshold}] `) + details;
      
      if (s.consecutiveFails >= config.postgres.maxThreshold && s.status !== 'OFFLINE') {
        s.status = 'OFFLINE';
        s.since = Date.now();
        s.drops.push(Date.now());
        s.errors++;
        
        Alerter.triggerDowntimeAlert('Postgres', details);
        Logger.log(chalk.red('[Postgres] ✖ OFFLINE — Threshold reached. Attempting background recovery...'));
        
        if (!s.suspended && !s.retrying) {
          this.heal();
        }
      }
    }
  }

  static async heal() {
    const s = state.services.postgres;
    s.retrying = true;
    s.restarts++;
    
    // OS Agnostic command
    const cmd = config.isWin ? 'net start postgresql-x64-18' : 'systemctl restart postgresql';
    await utils.runCmdAsync(cmd, 'pg');
    
    Alerter.triggerHealAlert('Postgres');
    s.retrying = false;
  }
}

module.exports = PostgresChecker;
