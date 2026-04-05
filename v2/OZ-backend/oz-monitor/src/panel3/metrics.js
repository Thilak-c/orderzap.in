// Panel 3 — Traffic metrics computed from live log events

const state = require('../state');

const Metrics = {
  record(data, isInternal) {
    if (isInternal) return;
    const m = state.metrics;

    m.totalRequests++;
    m.lastSecondCount++;

    const lat = parseFloat(data.latency) || 0;
    m.totalLatency += lat;
    m.avgLatency = m.totalLatency / m.totalRequests;

    const code = parseInt(data.status, 10);
    if (code < 400)      m.status2xx++;
    else if (code < 500) m.status4xx++;
    else                  m.status5xx++;

    const route = data.path || 'unknown';
    m.topRoutes[route] = (m.topRoutes[route] || 0) + 1;

    const ip = (data.ip || '').replace('::ffff:', '') || 'unknown';
    m.topIPs[ip] = (m.topIPs[ip] || 0) + 1;
  },

  // Called once per second by the main tick
  tick() {
    const m = state.metrics;
    m.rps = m.lastSecondCount;
    m.lastSecondCount = 0;
  },
};

module.exports = Metrics;
