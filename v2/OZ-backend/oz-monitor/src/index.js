const state = require('./state');
const config = require('./config');
const Logger = require('./core/logger');
const Analyzer = require('./core/analyzer');
const DashboardUI = require('./ui/dashboard');
const PostgresChecker = require('./checkers/postgres');
const ExpressChecker = require('./checkers/express');
const ConvexChecker = require('./checkers/convex');
const utils = require('./utils');
const Alerter = require('./core/alerter');
const AckServer = require('./core/ackServer');
const chalk = require('chalk');

class AppController {
  
  static cleanup() {
    const s = state.services.express;
    if (s.process && s.pid) {
      Logger.log(chalk.gray(`[Cleanup] Terminating Express background process (PID: ${s.pid})...`));
      try {
        process.kill(s.pid, 'SIGKILL');
      } catch(e) {}
    }
  }

  static async startTick() {
    state.tickCount++;
    if (!state.globalPause) {
      this.fetchDockerStats(); // For Tab 2
      
      // Process persistent alerts (recurring emails)
      await Alerter.processNagQueue();
      
      // --- Analytics Trend Processing ---
      const ana = state.analytics;
      const count = ana.lastSecondRequests;
      ana.lastSecondRequests = 0; // Reset for next second
      
      // Update RPS trend
      ana.rpsTrend.push(count);
      if (ana.rpsTrend.length > 60) ana.rpsTrend.shift();

      // Check for RPS spike
      if (count > config.thresholds.rps) {
        Alerter.triggerMetricAlert('traffic', count, config.thresholds.rps);
      }
      
      // Update Latency trend (Average within this window)
      const avgLat = ana.totalRequests > 0 ? (ana.totalLatency / ana.totalRequests) : 0;
      ana.latencyTrend.push(avgLat);
      if (ana.latencyTrend.length > 60) ana.latencyTrend.shift();

      // Check for Latency spike
      if (avgLat > config.thresholds.latency) {
        Alerter.triggerMetricAlert('latency', avgLat.toFixed(2), config.thresholds.latency);
      }

      await Promise.all([
        PostgresChecker.execute(),
        ExpressChecker.execute(),
        ConvexChecker.execute()
      ]);
    }
    DashboardUI.render();
  }

  static fetchDockerStats() {
    if (state.activeTab !== 1) return; // Only fetch if user is explicitly on the Docker tab
    
    try {
      const shell = config.isWin ? 'cmd' : '/bin/sh';
      const flag = config.isWin ? '/c' : '-c';
      const cmd = `docker stats --no-stream --format "{{.Name}}|||{{.CPUPerc}}|||{{.MemUsage}}|||{{.NetIO}}"`;
      
      require('child_process').exec(`${shell} ${flag} "${cmd}"`, (err, stdout) => {
        if (!err && stdout) {
          state.dockerStatsCache = stdout.split('\n').map(l => l.split('|||'));
          DashboardUI.render(); // force render when data arrives
        }
      });
    } catch(e) {}
  }

  static run() {
    process.stdout.write('\x1B[2J\x1B[H');
    Logger.log(chalk.cyan('Enterprise Monitor Started.'));
    
    // Start traffic analyzer and acknowledgement server
    Analyzer.startListening();
    AckServer.start(4001);
    
    // Keyboard setup
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', key => {
      // Ctrl+C
      if (key === '\u0003') {
        this.cleanup();
        process.stdout.write('\x1B[2J\x1B[H\n  Monitor closed via SIGINT.\n\n');
        process.exit(0);
      }

      // Arrows for scroll
      if (key === '\u001b[A' || key === '\u001bOA') { state.logScroll++; DashboardUI.render(); return; }
      if (key === '\u001b[B' || key === '\u001bOB') { state.logScroll = Math.max(0, state.logScroll - 1); DashboardUI.render(); return; }
      
      // Tabs
      if (['1','2','3','4','5'].includes(key)) { state.activeTab = parseInt(key)-1; DashboardUI.render(); return; }
      if (key === '\t') { state.activeTab = (state.activeTab + 1) % 5; DashboardUI.render(); return; }

      // Manual Test Alert
      if (key === '6') { Alerter.triggerManualTestEmail(); return; }

      // Esc -> abort command
      if (key === '\u001B') { state.overlayCmd = null; state.inputBuffer = ''; DashboardUI.render(); return; }

      // In Command Mode
      if (state.overlayCmd) {
        if (key === '\r' || key === '\n') {
          this.executeOverlay();
        } else if (key === '\u007F' || key === '\b') {
          state.inputBuffer = state.inputBuffer.slice(0, -1);
          DashboardUI.render();
        } else if (key.length === 1 && key >= ' ') {
          state.inputBuffer += key;
          DashboardUI.render();
        }
        return;
      }

      // Quick Keys
      const lk = key.toLowerCase();
      if (lk === 'q') { 
        this.cleanup();
        process.stdout.write('\x1B[2J\x1B[H\n  Monitor closed. Goodbye!\n\n'); 
        process.exit(0); 
      }
      if (lk === 'p') { state.globalPause = !state.globalPause; Logger.log(chalk.yellow(`Global pause: ${state.globalPause}`)); DashboardUI.render(); return; }
      if (['s','x'].includes(lk)) {
        state.overlayCmd = lk === 's' ? 'start' : 'stop';
        state.inputBuffer = '';
        DashboardUI.render();
        return;
      }
    });

    // Start Async Loop
    this.startTick().catch(()=>{});
    setInterval(() => this.startTick().catch(()=>{}), config.checkInterval);
  }

  static executeOverlay() {
    const cmd = state.overlayCmd;
    const target = state.inputBuffer.toLowerCase().trim();
    state.overlayCmd = null;
    state.inputBuffer = '';

    const tmap = { pg: 'postgres', express: 'express', convex: 'convex' };
    const svc = tmap[target] || target;

    if (!state.services[svc]) {
       Logger.log(chalk.red(`Command failed: Unknown service '${svc}'`));
       DashboardUI.render();
       return;
    }

    if (cmd === 'stop') {
       state.services[svc].suspended = true;
       Logger.log(chalk.yellow(`Suspended & Stopping ${svc}...`));
       if (svc === 'postgres') utils.runCmdAsync(config.isWin ? 'net stop postgresql-x64-18' : 'systemctl stop postgresql', 'pg');
       if (svc === 'express') {
         const s = state.services.express;
         if (s.process) {
           try { process.kill(s.pid, 'SIGKILL'); } catch(e) {}
         }
       }
       if (svc === 'convex') utils.runCmdAsync('docker compose stop', 'conv');
    } else if (cmd === 'start') {
       state.services[svc].suspended = false;
       Logger.log(chalk.green(`Resumed ${svc}. Triggering heal...`));
       
       if (svc === 'postgres') PostgresChecker.heal();
       if (svc === 'express') ExpressChecker.heal();
       if (svc === 'convex') ConvexChecker.heal();
    }
    DashboardUI.render();
  }
}

// ── Boot ───────────────────────────────────────────────────
AppController.run();
