const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const state = require('../state');

const LOG_DIR = path.join(__dirname, '../../logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB per file
let currentLogFile = path.join(LOG_DIR, 'monitor.log');

class Logger {
  static init() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
  }

  static rotateLogsIfNeeded() {
    try {
      if (fs.existsSync(currentLogFile)) {
        const stats = fs.statSync(currentLogFile);
        if (stats.size >= MAX_LOG_SIZE) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          fs.renameSync(currentLogFile, path.join(LOG_DIR, `monitor-${timestamp}.log`));
        }
      }
    } catch(e) {}
  }

  static log(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const formatted = `${chalk.gray('[' + ts + ']')} ${msg}`;
    
    // UI state
    state.eventLog.push(formatted);
    if (state.eventLog.length > 2000) state.eventLog.shift();
    if (state.logScroll > 0) state.logScroll++;

    // Disk persist
    try {
      this.rotateLogsIfNeeded();
      const cleanMsg = msg.replace(/\x1b\[\d+m/g, '').replace(/\x1b\[\d+;\d+m/g, ''); // strip ansi
      fs.appendFileSync(currentLogFile, `[${ts}] [${type.toUpperCase()}] ${cleanMsg}\n`);
    } catch(e) {}
  }
}

Logger.init();
module.exports = Logger;
