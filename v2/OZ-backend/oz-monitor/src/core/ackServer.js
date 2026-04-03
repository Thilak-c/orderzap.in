const http = require('http');
const url = require('url');
const state = require('../state');
const Logger = require('./logger');
const chalk = require('chalk');

/**
 * AckServer
 * ──────────────────────────────────────────────────────────
 * A tiny HTTP listener that waits for "I have seen" clicks
 * from the alerting emails to silence persistent nagging.
 */
class AckServer {
  static start(port = 4001) {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url, true);
      
      if (parsed.pathname === '/ack') {
        const id = parsed.query.id;
        
        if (id && state.pendingAlerts[id]) {
          const alert = state.pendingAlerts[id];
          delete state.pendingAlerts[id];
          
          Logger.log(chalk.green.bold(`✔ Alert Acknowledged: ${alert.service} recovery confirmed by admin via email.`));
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #0f172a; color: white;">
                <h1 style="color: #22c55e;">✔ Acknowledgement Received</h1>
                <p>Monitor has silenced the recurring alerts for <b>${alert.service}</b>.</p>
                <p style="color: #94a3b8;">You can close this tab now.</p>
              </body>
            </html>
          `);
          return;
        }
      }
      
      res.writeHead(404);
      res.end('Not Found');
    });

    server.listen(port, () => {
      Logger.log(chalk.blue(`Ack-Server listening on port ${port} for email confirmations.`));
    });

    server.on('error', (err) => {
      Logger.log(`Ack-Server failed to start: ${err.message}`, 'error');
    });
  }
}

module.exports = AckServer;
