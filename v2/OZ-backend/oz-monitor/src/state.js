const state = {
  startTime: Date.now(),
  memoryHistory: Array(60).fill(0),
  tickCount: 0,
  globalPause: false,
  
  activeTab: 0, // 0=Dashboard, 1=Docker, 2=Logs, 3=API Traffic, 4=Analytics
  overlayCmd: null,
  inputBuffer: '',
  
  services: {
    postgres: { name: 'Postgres', status: 'UNKNOWN', since: Date.now(), retrying: false, suspended: false, drops: [], errors: 0, restarts: 0, detail: '', consecutiveFails: 0 },
    express:  { name: 'Express',  status: 'UNKNOWN', since: Date.now(), retrying: false, suspended: false, drops: [], errors: 0, restarts: 0, detail: '', consecutiveFails: 0, pid: null, process: null },
    convex:   { name: 'Convex',   status: 'UNKNOWN', since: Date.now(), retrying: false, suspended: false, drops: [], errors: 0, restarts: 0, detail: '', consecutiveFails: 0 }
  },
  
  eventLog: [], // General events
  logScroll: 0,
  
  apiRequests: [], // For the API analyzer tab
  lastLogTimestamp: 0, // For convex polling
  
  dockerStatsCache: [],
  dockerPsCache: [],

  analytics: {
    totalRequests: 0,
    totalLatency: 0,
    internalChecks: 0,
    statusDistribution: { '2xx': 0, '4xx': 0, '5xx': 0 },
    topRoutes: {}, // route -> count
    topIPs: {},    // ip -> count
    latencyTrend: Array(60).fill(0), // 60-second rolling average latency
    rpsTrend: Array(60).fill(0),      // 60-second rolling requests per second
    lastSecondRequests: 0            // internal counter for RPS
  },

  pendingAlerts: {} // alertId -> { service, details, lastSent, timestamp }
};

module.exports = state;
