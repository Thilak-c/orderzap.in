// Terminal renderer — 3-panel side-by-side layout using chalk + log-update

const chalk     = require('chalk');
const logUpdate = require('log-update');
const state     = require('./state');

// ── ANSI-aware padding ─────────────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function vlen(s)       { return String(s).replace(ANSI_RE, '').length; }
function pad(s, w)     { const d = w - vlen(s); return d > 0 ? s + ' '.repeat(d) : s; }
function truncate(s,w) { return vlen(s) > w ? s.substring(0, w - 1) + '…' : s; }

// ── Formatting helpers ─────────────────────────────────────────────────────
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function statusBadge(status) {
  switch (status) {
    case 'UP':      return chalk.greenBright('● UP     ');
    case 'DOWN':    return chalk.redBright  ('● DOWN   ');
    case 'HEALING': return chalk.yellow     ('↻ HEALING');
    default:        return chalk.gray       ('? UNKNOWN');
  }
}

// ── Panel 1: Services ──────────────────────────────────────────────────────
function buildPanel1(w, maxH) {
  const L = [];
  L.push(chalk.bold.cyan(' ▸ SERVICES & SELF-HEAL'));
  L.push(chalk.gray('─'.repeat(w)));

  for (const svc of Object.values(state.services)) {
    L.push(` ${statusBadge(svc.status)}  ${chalk.white.bold(svc.name)}`);
    L.push(chalk.gray(`   since    : ${fmtUptime(Date.now() - svc.since)}`));
    L.push(chalk.gray(`   restarts : ${svc.restarts}   failures: ${svc.failures}`));
    if (svc.lastError) {
      L.push(chalk.red(`   ! ${truncate(svc.lastError, w - 5)}`));
    } else {
      L.push(chalk.green(`   last err : none`));
    }
    L.push('');
  }

  const paused = state.paused ? chalk.bgYellow.black(' PAUSED ') + ' ' : '';
  while (L.length < maxH - 4) L.push('');
  L.push(chalk.gray('─'.repeat(w)));
  L.push(chalk.gray(` ${paused}[p] pause  [q] quit`));
  L.push(chalk.gray(` [6] test alert`));
  L.push('');
  return L;
}

// ── Panel 2: Live Logs ─────────────────────────────────────────────────────
function buildPanel2(w, maxH) {
  const L = [];
  L.push(chalk.bold.cyan(' ▸ LIVE LOGS'));
  L.push(chalk.gray('─'.repeat(w)));

  const visible  = Math.max(1, maxH - 6);
  const logSlice = state.logs.slice(state.logScroll, state.logScroll + visible);

  for (const entry of logSlice) {
    const src = entry.source === 'express'  ? chalk.blue('[EX]') :
                entry.source === 'postgres' ? chalk.magenta('[PG]') :
                entry.source === 'convex'   ? chalk.cyan('[CV]') :
                                              chalk.white('[SY]');
    const msg = entry.level === 'error' ? chalk.red(entry.msg) :
                entry.level === 'warn'  ? chalk.yellow(entry.msg) :
                                          chalk.gray(entry.msg);
    L.push(truncate(` ${src} ${chalk.gray(entry.time)} ${msg}`, w * 2));
  }

  while (L.length < maxH - 4) L.push('');
  L.push(chalk.gray('─'.repeat(w)));
  L.push(chalk.gray(` ${state.logs.length} entries  scroll: ${state.logScroll}`));
  L.push(chalk.gray(` [↑↓] scroll   [c] clear`));
  L.push('');
  return L;
}

// ── Panel 3: Traffic Metrics ───────────────────────────────────────────────
function buildPanel3(w, maxH) {
  const m = state.metrics;
  const L = [];
  L.push(chalk.bold.cyan(' ▸ TRAFFIC METRICS'));
  L.push(chalk.gray('─'.repeat(w)));

  L.push(` ${chalk.white('RPS      ')}  ${chalk.yellow.bold(m.rps.toFixed(1))} ${chalk.gray('req/s')}`);
  L.push(` ${chalk.white('Total    ')}  ${chalk.white(m.totalRequests.toLocaleString())} ${chalk.gray('requests')}`);
  L.push(` ${chalk.white('Avg Lat  ')}  ${chalk.white(m.avgLatency.toFixed(1))}${chalk.gray('ms')}`);
  L.push('');

  const total = (m.status2xx + m.status4xx + m.status5xx) || 1;
  const p2 = ((m.status2xx / total) * 100).toFixed(0);
  const p4 = ((m.status4xx / total) * 100).toFixed(0);
  const p5 = ((m.status5xx / total) * 100).toFixed(0);
  L.push(` ${chalk.green(`2xx ${p2}%`)}   ${chalk.yellow(`4xx ${p4}%`)}   ${chalk.red(`5xx ${p5}%`)}`);
  L.push('');

  // Top Routes
  L.push(chalk.gray(' Top Routes:'));
  const routes = Object.entries(m.topRoutes).sort(([,a],[,b]) => b - a).slice(0, 5);
  if (routes.length === 0) {
    L.push(chalk.gray('  no traffic yet'));
  } else {
    for (const [route, count] of routes) {
      const r = truncate(route, w - 8);
      L.push(` ${chalk.cyan(pad(r, w - 8))} ${chalk.white(count)}`);
    }
  }
  L.push('');

  // Top IPs
  L.push(chalk.gray(' Top IPs:'));
  const ips = Object.entries(m.topIPs).sort(([,a],[,b]) => b - a).slice(0, 3);
  if (ips.length === 0) {
    L.push(chalk.gray('  no data'));
  } else {
    for (const [ip, count] of ips) {
      L.push(` ${chalk.cyan(pad(ip, w - 8))} ${chalk.white(count)}`);
    }
  }

  while (L.length < maxH - 4) L.push('');
  L.push(chalk.gray('─'.repeat(w)));
  L.push(chalk.gray(` Monitor uptime: ${fmtUptime(Date.now() - state.startTime)}`));
  L.push(chalk.gray(` [6] test email alert`));
  L.push('');
  return L;
}

// ── Main render ────────────────────────────────────────────────────────────
function render() {
  const cols  = (process.stdout.columns || 120);
  const rows  = (process.stdout.rows    || 30);
  const w     = Math.floor(cols / 3) - 1;
  const maxH  = Math.max(10, rows - 5); // 5 rows of breathing room to absolutely prevent terminal scrolling

  const p1 = buildPanel1(w, maxH);
  const p2 = buildPanel2(w, maxH);
  const p3 = buildPanel3(w, maxH);

  const height = Math.max(p1.length, p2.length, p3.length);

  // Header bar
  const hText  = ` OZ MONITOR v2   uptime: ${fmtUptime(Date.now() - state.startTime)}   ${state.paused ? '⏸ PAUSED' : '▶ LIVE'}`;
  const header = chalk.bgBlack.bold(pad(chalk.white(hText), cols));

  const divider = chalk.gray('═'.repeat(cols));

  const out = [header, divider];

  for (let i = 0; i < height; i++) {
    const c1 = pad(p1[i] || '', w);
    const c2 = pad(p2[i] || '', w);
    const c3 = pad(p3[i] || '', w);
    out.push(c1 + chalk.gray('│') + ' ' + c2 + chalk.gray('│') + ' ' + c3);
  }

  // Move cursor to top-left, overwrite the screen, and clear the rest
  process.stdout.write('\x1B[H' + out.join('\n') + '\n\x1B[0J');
}

module.exports = { render };
