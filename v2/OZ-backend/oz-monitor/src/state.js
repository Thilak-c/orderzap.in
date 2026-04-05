const state = {
  startTime: Date.now(),
  paused: false,
  logScroll: 0,

  services: {
    express:  { name: 'Express',    status: 'UNKNOWN', since: Date.now(), restarts: 0, failures: 0, lastError: '' },
    postgres: { name: 'PostgreSQL', status: 'UNKNOWN', since: Date.now(), restarts: 0, failures: 0, lastError: '' },
    convex:   { name: 'Convex',     status: 'UNKNOWN', since: Date.now(), restarts: 0, failures: 0, lastError: '' },
  },

  logs: [], // { time, source, level, msg }

  metrics: {
    totalRequests: 0,
    totalLatency:  0,
    lastSecondCount: 0,
    rps:       0,
    avgLatency: 0,
    status2xx: 0,
    status4xx: 0,
    status5xx: 0,
    topRoutes: {},
    topIPs:    {},
  },
};

module.exports = state;
