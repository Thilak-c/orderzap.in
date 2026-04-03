const logUpdate = require('log-update');
const Table = require('cli-table3');
const chalk = require('chalk');
const os = require('os');
const asciichart = require('asciichart');
const state = require('../state');
const utils = require('../utils');

class DashboardUI {

  static render() {
    let out = '';
    const now = Date.now();

    // 1. Header
    out += '\n' + chalk.cyan.bold('  ╔══════════════════════════════════════════════════════════════════════╗') + '\n';
    out += chalk.cyan.bold('  ║  ') + chalk.magenta.bold('⚡ ORDERZAP ENTERPRISE MONITOR ') + chalk.gray(' v3 ') + chalk.white(' ── ') + chalk.yellow('Concurrent Polling Active') + chalk.cyan.bold('     ║\n');
    out += chalk.cyan.bold('  ╚══════════════════════════════════════════════════════════════════════╝') + '\n\n';

    // 2. Tabs
    const tabs = ['[1] Dashboard', '[2] Docker Stats', '[3] Full Logs', '[4] API Traffic (Live)', '[5] Analytics'];
    const tabStr = tabs.map((t, i) => state.activeTab === i ? chalk.bgWhite.black(`  ${t}  `) : chalk.gray(`  ${t}  `)).join(' ');
    out += `  ${tabStr}  ${chalk.yellow.bold('[6] Test Email')}\n\n`;

    // 3. Tab Content
    if (state.activeTab === 0) {
      out += this.renderDashboard(now);
    } else if (state.activeTab === 1) {
      out += this.renderDockerStats();
    } else if (state.activeTab === 2) {
      out += this.renderFullLogs();
    } else if (state.activeTab === 3) {
      out += this.renderAPITraffic();
    } else if (state.activeTab === 4) {
      out += this.renderAnalytics();
    }

    // 4. Command Bar Overlay
    out += this.renderCommandBar();

    logUpdate(out);
  }

  static renderDashboard(now) {
    let out = '';
    
    // Services Table
    const t = new Table({
      head: ['Service', 'Status', 'Duration', 'Details (Triple Validation)', 'Restarts'].map(h => chalk.white.bold(h)),
      style: { head: [], border: ['gray'] },
      colWidths: [13, 14, 12, 38, 10]
    });

    Object.values(state.services).forEach(s => {
      let det = s.detail;
      if (s.suspended) det = chalk.gray('⏸ Paused');
      else if (s.retrying) det = chalk.yellow('⏳ Healing...');
      
      const flaps = s.drops.filter(ts => ts > now - 180000).length;
      if (s.status === 'ONLINE' && flaps >= 3) det += chalk.redBright(` (Flapping)`);

      t.push([chalk.bold(s.name), utils.statusBadge(s.status), utils.duration(now - s.since), det, s.restarts.toString()]);
    });
    out += t.toString().split('\n').map(l => '  ' + l).join('\n') + '\n\n';

    // Graph
    const memUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
    state.memoryHistory.push(memUsage);
    if (state.memoryHistory.length > 60) state.memoryHistory.shift();

    out += chalk.white.bold('  ┌─ System Memory Trend ────────────────────────────────────────────────\n');
    out += chalk.gray(`  │  Current Host Usage: ${memUsage.toFixed(1)}%\n`);
    try {
      const chart = asciichart.plot(state.memoryHistory, { height: 4 });
      out += chart.split('\n').map(l => chalk.cyan('  │ ') + chalk.greenBright(l)).join('\n') + '\n';
    } catch(e) { out += chalk.gray('  │ Waiting for data...\n'); }
    out += chalk.white.bold('  └───────────────────────────────────────────────────────────────────────\n\n');

    // Mini log
    out += chalk.white.bold('  ┌─ Recent System Events ────────────────────────────────────────────────\n');
    const logs = state.eventLog.slice(-5);
    if (!logs.length) out += chalk.gray('  │ No events yet...\n');
    else out += logs.map(l => `  │ ${l}`).join('\n') + '\n';
    out += chalk.white.bold('  └───────────────────────────────────────────────────────────────────────\n\n');

    return out;
  }

  static renderDockerStats() {
    let out = chalk.white.bold('  ── Docker Resource Usage ───────────────────────────────────────────────\n\n');
    if (!state.dockerStatsCache.length) {
      out += chalk.gray('  Collecting stats (Updates every tick)...\n\n');
      return out;
    }
    const t = new Table({
      head: ['Container', 'CPU', 'Mem Usage', 'Net I/O'].map(h => chalk.white.bold(h)),
      style: { head: [], border: ['gray'] },
      colWidths: [25, 12, 17, 20]
    });
    state.dockerStatsCache.forEach(row => {
       if(row.length >= 4) t.push(row);
    });
    out += t.toString().split('\n').map(l => '  ' + l).join('\n') + '\n\n';
    return out;
  }

  static renderFullLogs() {
    const max = 20;
    const start = Math.max(0, state.eventLog.length - max - state.logScroll);
    const end = Math.max(1, state.eventLog.length - state.logScroll);
    const slice = state.eventLog.slice(start, end);

    let out = chalk.white.bold(`  ── Event History (Scrolled -${state.logScroll}) (Saved to logs/monitor-*.log) ────────\n\n`);
    if (!slice.length) out += chalk.gray('  No logs recorded yet.\n\n');
    else out += slice.map(l => `    ${l}`).join('\n') + '\n\n';
    return out;
  }

  static renderAPITraffic() {
     let out = chalk.white.bold(`  ── Express API Detailed Telemetry (Live Trace) ──────────────────────────────────────────────────────────\n\n`);
     if (!state.apiRequests.length) {
       out += chalk.gray('  Waiting for structured JSON traces from Docker / Express...\n\n');
       return out;
     }

     const t = new Table({
       head: ['Time', 'Method', 'Route', 'Status', 'Latency', 'IP', 'Port', 'Client Agent'].map(h => chalk.white.bold(h)),
       style: { head: [], border: ['gray'] },
       colWidths: [10, 8, 22, 8, 10, 16, 7, 25]
     });

     state.apiRequests.slice(0, 15).forEach(req => {
       const isInt = req.internal;
       
       let methodFmt = ['GET'].includes(req.method) ? chalk.green(req.method) : 
                        ['POST', 'PUT', 'PATCH'].includes(req.method) ? chalk.blue(req.method) : chalk.red(req.method);
       
       const st = parseInt(req.status, 10);
       let stFmt = st < 400 ? chalk.green(req.status) : st < 500 ? chalk.yellow(req.status) : chalk.red(req.status);

       const ms = parseFloat(req.latency);
       let lFmt = ms < 100 ? chalk.green(`${ms}ms`) : ms < 500 ? chalk.yellow(`${ms}ms`) : chalk.red.bold(`${ms}ms`);
       
       let agent = req.reason || 'none';
       if (agent.length > 22) agent = agent.substring(0, 19) + '...'; 
       
       let route = isInt ? chalk.gray(`[SERVER] ${req.route}`) : req.route;
       let ipTr = isInt ? chalk.gray(req.ip) : chalk.cyan(req.ip || 'unknown');

       if (isInt) {
         methodFmt = chalk.gray(req.method);
         stFmt = chalk.gray(req.status);
         lFmt = chalk.gray(`${ms}ms`);
         agent = chalk.gray(agent);
       }

       t.push([chalk.gray(req.ts), methodFmt, route, stFmt, lFmt, ipTr, isInt ? chalk.gray(req.port) : req.port || '-', isInt ? agent : chalk.gray(agent)]);
     });

     out += t.toString().split('\n').map(l => '  ' + l).join('\n') + '\n\n';
     return out;
  }

  static renderAnalytics() {
    const ana = state.analytics;
    let out = chalk.white.bold('  ── Enterprise Analytics Dashboard (Global Insights) ────────────────────────────────────────────────\n\n');

    // 1. Summary Row
    const avg = ana.totalRequests > 0 ? (ana.totalLatency / ana.totalRequests).toFixed(2) : 0;
    const t = new Table({
      head: ['Metric', 'Value', 'Breakdown'].map(h => chalk.white.bold(h)),
      style: { head: [], border: ['gray'] },
      colWidths: [25, 12, 35]
    });
    
    t.push([chalk.cyan('Total User Requests'), ana.totalRequests.toLocaleString(), chalk.gray('Pure customer session traffic')]);
    t.push([chalk.gray('Internal Checks'), (ana.internalChecks || 0).toLocaleString(), chalk.gray('[SERVER] background probes')]);
    t.push([chalk.cyan('Avg Latency'), chalk.yellow(avg + ' ms'), chalk.gray('Global response average')]);
    t.push([chalk.cyan('Status Groups'), chalk.green(ana.statusDistribution['2xx']), chalk.green('Success (2xx)')]);
    t.push(['', chalk.yellow(ana.statusDistribution['4xx']), chalk.yellow('Client Err (4xx)')]);
    t.push(['', chalk.red(ana.statusDistribution['5xx']), chalk.red('Server Err (5xx)')]);

    out += t.toString().split('\n').map(l => '  ' + l).join('\n') + '\n\n';

    // 2. Charts
    out += chalk.white.bold('  ┌─ Requests Per Second (RPS) ─────────────────  ┌─ Latency Trend (ms) ──────────────────────────\n');
    try {
      const rpsChart = asciichart.plot(ana.rpsTrend, { height: 4 }).split('\n');
      const latChart = asciichart.plot(ana.latencyTrend, { height: 4 }).split('\n');
      
      for(let i=0; i<5; i++) {
        const r = (rpsChart[i] || '').padEnd(46);
        const l = (latChart[i] || '').padEnd(46);
        out += `  │ ${chalk.green(r)} │ ${chalk.yellow(l)}\n`;
      }
    } catch(e) {}
    out += chalk.white.bold('  └───────────────────────────────────────────────  └───────────────────────────────────────────────\n\n');

    // 3. Rankings
    const topRoutes = Object.entries(ana.topRoutes).sort((a,b) => b[1]-a[1]).slice(0, 5);
    const topIPs = Object.entries(ana.topIPs).sort((a,b) => b[1]-a[1]).slice(0, 5);

    const rTable = new Table({
      head: ['Top Endpoints', 'Hits', 'Top Client IPs', 'Hits'].map(h => chalk.white.bold(h)),
      style: { head: [], border: ['gray'] },
      colWidths: [30, 8, 25, 8]
    });

    for(let i=0; i<5; i++) {
       const rt = topRoutes[i] || ['', ''];
       const ip = topIPs[i] || ['', ''];
       rTable.push([chalk.blue(rt[0]), rt[1], chalk.cyan(ip[0]), ip[1]]);
    }
    
    out += rTable.toString().split('\n').map(l => '  ' + l).join('\n') + '\n\n';

    return out;
  }

  static renderCommandBar() {
    let out = '';
    if (state.globalPause) {
      out += chalk.bgYellow.black('  [!] GLOBAL AUTORESTART SUSPENDED ') + '\n';
    }

    if (state.overlayCmd) {
      out += chalk.bgBlue.white(`  Enter service to ${state.overlayCmd} (pg, express, convex): `) + state.inputBuffer + '_\n';
    } else {
       out += chalk.gray('  [1-5] Tabs  [Up/Dn] Scroll Logs  [s] Start/Stop  [p] Pause All  [q] Quit\n');
    }
    return out;
  }
}

module.exports = DashboardUI;
