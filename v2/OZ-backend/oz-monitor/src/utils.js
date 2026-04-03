const { spawn, execSync } = require('child_process');
const config = require('./config');
const Logger = require('./core/logger');
const chalk = require('chalk');

const utils = {
  duration: (ms) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  },
  
  statusBadge: (st) => st === 'ONLINE' ? chalk.greenBright('● ONLINE ') : st === 'OFFLINE' ? chalk.redBright('● OFFLINE') : chalk.yellow('● UNKNOWN'),
  
  runCmdSync: (cmd) => {
    try { 
      return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); 
    } catch(e) { 
      return ''; 
    }
  },
  
  runCmdAsync: (cmd, name) => new Promise((resolve) => {
    const shell = config.isWin ? 'cmd' : '/bin/sh';
    const flag = config.isWin ? '/c' : '-c';
    
    const child = spawn(shell, [flag, cmd], { cwd: config.projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => Logger.log(chalk.gray(`  │ [${name}] ${d.toString().trim()}`)));
    child.stderr.on('data', d => Logger.log(chalk.yellow(`  │ [${name} ERR] ${d.toString().trim()}`)));
    child.on('close', code => resolve(code));
  })
};

module.exports = utils;
