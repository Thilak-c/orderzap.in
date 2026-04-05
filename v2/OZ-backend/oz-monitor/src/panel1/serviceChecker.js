// Panel 1 — Service health checker
// TCP + HTTP for Express, pg connect for Postgres, HTTP for Convex

const net  = require('net');
const http = require('http');
const { Client } = require('pg');
const state      = require('../state');
const config     = require('../config');
const SelfHealer = require('./selfHealer');
const { addLog } = require('../panel2/logStreamer');

const THRESHOLD = 3; // consecutive fails before OFFLINE

const fails = { express: 0, postgres: 0, convex: 0 };

// ── Helpers ────────────────────────────────────────────────────────────────

function tcpCheck(host, port, timeout = 2000) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(timeout);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error',   () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

function httpCheck(url, timeout = 2500) {
  return new Promise(resolve => {
    const t0  = Date.now();
    const mod = url.startsWith('https') ? require('https') : http;
    const req = mod.get(url, { timeout, headers: { 'User-Agent': 'OZ-Monitor/2' } }, res => {
      res.resume();
      resolve({ ok: res.statusCode < 500, code: res.statusCode, latency: Date.now() - t0 });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 'TIMEOUT', latency: timeout }); });
    req.on('error',   e  => resolve({ ok: false, code: e.code || e.message, latency: Date.now() - t0 }));
  });
}

function markUp(key, detail) {
  const svc = state.services[key];
  const wasDown = svc.status !== 'UP';
  fails[key] = 0;
  svc.status    = 'UP';
  svc.lastError = '';
  if (wasDown) {
    svc.since = Date.now();
    addLog(key, 'info', `Back online — ${detail}`);
  }
}

function markFail(key, reason) {
  const svc = state.services[key];
  fails[key]++;
  svc.lastError = reason.substring(0, 60);

  if (fails[key] >= THRESHOLD && svc.status !== 'DOWN' && svc.status !== 'HEALING') {
    svc.status  = 'DOWN';
    svc.since   = Date.now();
    svc.failures++;
    addLog(key, 'error', `OFFLINE [${fails[key]}/${THRESHOLD}] — ${reason}`);

    // Trigger self-heal
    if (key === 'express')  SelfHealer.healExpress();
    if (key === 'postgres') SelfHealer.healPostgres();
    if (key === 'convex')   SelfHealer.healConvex();
  }
}

// ── Checkers ────────────────────────────────────────────────────────────────

async function checkExpress() {
  try {
    const tcpOk = await tcpCheck('127.0.0.1', config.express.port);
    if (!tcpOk) { markFail('express', `TCP refused on :${config.express.port}`); return; }

    const { ok, code, latency } = await httpCheck(config.express.healthUrl);
    if (ok) markUp('express', `HTTP ${code} ${latency}ms`);
    else    markFail('express', `HTTP ${code}`);
  } catch (e) {
    markFail('express', e.message);
  }
}

async function checkPostgres() {
  const client = new Client({ connectionString: config.postgres.uri, connectionTimeoutMillis: 3000 });
  try {
    const t0 = Date.now();
    await client.connect();
    await client.query('SELECT 1');
    const lat = Date.now() - t0;
    await client.end();
    markUp('postgres', `query OK ${lat}ms`);
  } catch (e) {
    try { await client.end(); } catch (_) {}
    markFail('postgres', e.message.split('\n')[0]);
  }
}

async function checkConvex() {
  try {
    const { code, latency } = await httpCheck(config.convex.url, 3000);
    // Any HTTP response means Convex is accepting connections
    if (typeof code === 'number') markUp('convex', `HTTP ${code} ${latency}ms`);
    else                          markFail('convex', String(code));
  } catch (e) {
    markFail('convex', e.message);
  }
}

// Run all checks in parallel every tick
async function checkAll() {
  if (state.paused) return;
  await Promise.all([checkExpress(), checkPostgres(), checkConvex()]);
}

module.exports = { checkAll };
