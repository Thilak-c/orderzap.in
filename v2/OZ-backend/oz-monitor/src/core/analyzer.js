const path = require('path');
const state = require('../state');
const { spawn } = require('child_process');
const config = require('../config');
const Logger = require('./logger');
const DashboardUI = require('../ui/dashboard');
const chalk = require('chalk');

/**
 * Analyzer System
 * Hooks directly into Express Docker logs and parses them in real time
 * Looks for specific JSON or structured strings to map as "API_REQUEST" logs
 */
class Analyzer {
  constructor() {
    this.process = null;
  }

  startListening() {
    try {
      const logPath = path.join(config.projectRoot, 'express', 'logs', 'access.log');
      
      // Ensure directory exists so tailing doesn't fail immediately
      const logDir = path.dirname(logPath);
      if (!require('fs').existsSync(logDir)) {
        require('fs').mkdirSync(logDir, { recursive: true });
      }
      if (!require('fs').existsSync(logPath)) {
        require('fs').writeFileSync(logPath, '');
      }

      Logger.log(chalk.gray(`[Analyzer] Tailing telemetry: ${logPath}`));

      if (config.isWin) {
        // Windows: PowerShell Get-Content -Wait
        this.process = spawn('powershell', ['-Command', `Get-Content -Path "${logPath}" -Wait -Tail 0`], { stdio: ['ignore', 'pipe', 'pipe'] });
      } else {
        // Linux/Mac: tail -f
        this.process = spawn('tail', ['-f', logPath], { stdio: ['ignore', 'pipe', 'pipe'] });
      }
      
      this.process.stdout.on('data', data => this.parseLogChunk(data.toString()));
      this.process.stderr.on('data', data => Logger.log(chalk.red(`[Analyzer Error] ${data.toString().trim()}`)));
      
    } catch(e) {
      Logger.log(chalk.red(`[Analyzer Crash] ${e.message}`));
    }
  }

  parseLogChunk(chunk) {
    const lines = chunk.split('\n').filter(Boolean);
    
    lines.forEach(line => {
      // Decode our special JSON trace logger
      // The file logger appends raw JSON strings per line
      try {
        const data = JSON.parse(line.trim());
        
        const isInternal = data.reason && data.reason.includes('OZ-Monitor');
        
        state.apiRequests.unshift({
          ts: new Date(data.ts).toLocaleTimeString('en-US', {hour12:false}),
          method: data.method,
          route: data.path,
          status: data.status,
          latency: parseFloat(data.latency),
          ip: data.ip.replace('::ffff:', ''), // clean ipv6 wrappers
          port: data.port,
          reason: data.reason,
          internal: isInternal
        });
        
        // --- High-Level Analytics Processing ---
        const s = state.analytics;
        
        if (isInternal) {
          s.internalChecks = (s.internalChecks || 0) + 1;
        } else {
          s.totalRequests++;
          const lat = parseFloat(data.latency);
          s.totalLatency += lat;
          
          // Status Distribution
          const st = parseInt(data.status, 10);
          if (st < 300) s.statusDistribution['2xx']++;
          else if (st < 500) s.statusDistribution['4xx']++;
          else s.statusDistribution['5xx']++;
          
          // Top Routes
          const r = data.path;
          s.topRoutes[r] = (s.topRoutes[r] || 0) + 1;
          
          // Top IPs
          const ip = data.ip.replace('::ffff:', '');
          s.topIPs[ip] = (s.topIPs[ip] || 0) + 1;

          // Current Second Requests (for RPS)
          s.lastSecondRequests++;
        }
        
        if (state.apiRequests.length > 50) state.apiRequests.pop();
        DashboardUI.render(); // Force refresh on new traffic
      } catch(e) {
        // Fallback for non-json lines if any
      }
    });
  }
}

module.exports = new Analyzer();
