require('dotenv').config();
const path = require('path');

const config = {
  // General
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '1000', 10),
  projectRoot: process.env.PROJECT_ROOT || path.resolve(__dirname, '../../'),
  
  // OS Details
  isWin: process.platform === 'win32',

  // Services
  postgres: {
    host: process.env.PG_HOST || '127.0.0.1',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    uri: process.env.PG_URL || process.env.DATABASE_URL || 'postgresql://postgres:8008@127.0.0.1:5432/OZ-T',
    maxThreshold: parseInt(process.env.PG_MAX_FAILS || '3', 10)
  },
  express: {
    host: '127.0.0.1',
    port: parseInt(process.env.PORT || '4000', 10),
    healthUrl: `http://127.0.0.1:${process.env.PORT || '4000'}/api/health`,
    maxThreshold: parseInt(process.env.EXPRESS_MAX_FAILS || '3', 10)
  },
  convex: {
    url: process.env.CONVEX_URL || 'http://127.0.0.1:3210',
    maxThreshold: parseInt(process.env.CONVEX_MAX_FAILS || '3', 10),
    dockerService: process.env.DOCKER_BACKEND_SERVICE || 'backend'
  },
  
  // Alerter / Webhooks
  webhooks: {
    slackUrl: process.env.SLACK_WEBHOOK_URL || '',
    discordUrl: process.env.DISCORD_WEBHOOK_URL || ''
  },
  
  // Email Alerting (Hostinger)
  email: {
    host: 'smtp.hostinger.com',
    port: 465, // SSL
    secure: true,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    to: process.env.ALERT_TO_EMAIL, // Comma separated list
    ackUrl: process.env.ACK_BASE_URL || 'http://localhost:4001'
  },

  // Alert Thresholds
  thresholds: {
    latency: parseInt(process.env.ALERT_LATENCY_THRESHOLD || '2000', 10),
    rps: parseInt(process.env.ALERT_RPS_THRESHOLD || '50', 10),
    cooldownMs: 5 * 60 * 1000, // 5 minutes between similar metric alerts
    nagIntervalMs: 2 * 60 * 1000 // 2 minutes between repeating critical alerts
  }
};

module.exports = config;
