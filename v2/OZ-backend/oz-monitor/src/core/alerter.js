const https = require('https');
const nodemailer = require('nodemailer');
const config = require('../config');
const Logger = require('./logger');
const state = require('../state');

class Alerter {
  static lastAlerts = {}; // Cooldown tracking for spikes

  static getTransporter() {
    if (!config.email.user || !config.email.pass) return null;
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  static async sendEmail(subject, text, html = null) {
    const transporter = this.getTransporter();
    if (!transporter || !config.email.to) return;

    try {
      await transporter.sendMail({
        from: `"OZ System Monitor" <${config.email.user}>`,
        to: config.email.to,
        subject: `[SYSTEM] ${subject}`,
        text: text,
        html: html || `<div style="font-family: monospace;">${text.replace(/\n/g, '<br>')}</div>`
      });
      Logger.log(`System Alert dispatched: ${subject}`, 'success');
    } catch (err) {
      Logger.log(`Failed to dispatch system alert: ${err.message}`, 'error');
    }
  }

  static sendSlackAlert(message) {
    if (!config.webhooks.slackUrl) return;
    const payload = JSON.stringify({ text: `[CRITICAL MONITOR ALERT]\n${message}` });
    this.postUrl(config.webhooks.slackUrl, payload);
  }

  static sendDiscordAlert(message) {
    if (!config.webhooks.discordUrl) return;
    const payload = JSON.stringify({ content: `**[CRITICAL MONITOR ALERT]**\n${message}` });
    this.postUrl(config.webhooks.discordUrl, payload);
  }

  static triggerDowntimeAlert(serviceName, reason) {
    const alertId = `${serviceName.toLowerCase()}_${Date.now()}`;
    const msg = `CRITICAL: Service [${serviceName}] has terminated execution or failed health validation.\nReason: ${reason}`;
    
    state.pendingAlerts[alertId] = {
      service: serviceName,
      details: reason,
      timestamp: Date.now(),
      lastSent: Date.now()
    };

    const ackUrl = `${config.email.ackUrl}/ack?id=${alertId}`;
    const html = `
      <div style="font-family: 'Courier New', Courier, monospace; max-width: 650px; border: 3px solid #000; background: #fff; color: #000;">
        <div style="background: #e11d48; color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">CRITICAL SYSTEM FAILURE</h1>
        </div>
        <div style="padding: 30px; line-height: 1.5;">
          <div style="background: #f8fafc; border-left: 5px solid #e11d48; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><b>NODE_IDENTIFIER:</b> ${serviceName}</p>
            <p style="margin: 5px 0;"><b>FAILURE_REASON:</b> ${reason}</p>
            <p style="margin: 5px 0;"><b>TIMESTAMP:</b> ${new Date().toISOString()}</p>
            <p style="margin: 5px 0;"><b>INCIDENT_ID:</b> ${alertId}</p>
          </div>
          <p style="font-size: 14px; color: #475569;">IMMEDIATE ACTION REQUIRED: The system has detected a non-nominal state in the production environment. Manual intervention is requested to restore service integrity.</p>
          <hr style="border: 0; border-top: 1px solid #000; margin: 30px 0;">
          <div style="text-align: center;">
            <p style="color: #64748b; font-size: 13px;">THIS IS A PERSISTENT ALERT. RECURRING NOTIFICATIONS WILL CEASE ONLY UPON RECEIPT OF ACKNOWLEDGEMENT.</p>
            <a href="${ackUrl}" style="display: inline-block; background: #000; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; border: 2px solid #000;">ACKNOWLEDGE CRITICAL ALERT</a>
          </div>
        </div>
      </div>
    `;

    this.sendSlackAlert(msg);
    this.sendDiscordAlert(msg);
    this.sendEmail(`CRITICAL FAILURE: ${serviceName.toUpperCase()}`, msg, html);
    
    Logger.log(`System Alert: Persistent monitoring initiated for ${serviceName} failure.`, 'warn');
  }

  static triggerHealAlert(serviceName) {
    const msg = `RECOVERY: Service [${serviceName}] has successfully re-initialized and passed validation. Service restored to nominal state.`;
    const html = `
      <div style="font-family: 'Courier New', Courier, monospace; max-width: 650px; border: 2px solid #000; background: #fff; color: #000;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">SYSTEM RECOVERY CONFIRMED</h1>
        </div>
        <div style="padding: 25px;">
          <p>Service re-initialized: <b>${serviceName}</b></p>
          <p>Verification: <b>SUCCESS</b></p>
          <p>Environment: <b>NOMINAL</b></p>
        </div>
      </div>
    `;
    this.sendEmail(`RECOVERY: ${serviceName.toUpperCase()} RESTORED`, msg, html);
  }

  static triggerMetricAlert(type, value, threshold) {
    const now = Date.now();
    const alertKey = `spike_${type}`;
    
    if (this.lastAlerts[alertKey] && (now - this.lastAlerts[alertKey] < config.thresholds.cooldownMs)) return; 

    const msg = `WARNING: Performance anomaly detected.\nMetric: ${type.toUpperCase()}\nObserved: ${value}\nThreshold: ${threshold}`;
    const html = `
      <div style="font-family: 'Courier New', Courier, monospace; max-width: 650px; border: 2px solid #000; background: #fff; color: #000;">
        <div style="background: #ea580c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">PERFORMANCE ANOMALY DETECTED</h1>
        </div>
        <div style="padding: 25px;">
          <p>OBSERVED METRIC: <b>${type.toUpperCase()}</b></p>
          <p>VALUE: <span style="background: #ffedd5; padding: 2px 4px;">${value}</span></p>
          <p>THRESHOLD: ${threshold}</p>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">System performance is deviating from baseline parameters.</p>
        </div>
      </div>
    `;
    
    this.sendEmail(`ANOMALY: ${type.toUpperCase()} DEVIATION`, msg, html);
    this.lastAlerts[alertKey] = now;
  }

  static triggerManualTestEmail() {
    Logger.log('Dispatching system-wide operational test alert...', 'warn');
    this.triggerDowntimeAlert('TEST_SERVICE_IDENTIFIER', 'Simulated system integrity failure for verification.');
  }

  static async processNagQueue() {
    const now = Date.now();
    for (const [id, alert] of Object.entries(state.pendingAlerts)) {
      if (now - alert.lastSent >= config.thresholds.nagIntervalMs) {
        Logger.log(`System: Re-dispatching persistent alert for ${alert.service} integrity failure.`, 'warn');
        alert.lastSent = now;
        
        const ackUrl = `${config.email.ackUrl}/ack?id=${id}`;
        const html = `
          <div style="font-family: 'Courier New', Courier, monospace; max-width: 650px; border: 3px solid #000; background: #fff;">
             <div style="background: #000; color: white; padding: 15px; text-align: center;">
                <h3 style="margin: 0; letter-spacing: 3px;">RECURRING CRITICAL ALERT</h3>
             </div>
             <div style="padding: 25px;">
                <p><b>ALERT STATUS:</b> UNACKNOWLEDGED</p>
                <p><b>TARGET:</b> ${alert.service}</p>
                <p><b>ELAPSED TIME:</b> ${Math.floor((now - alert.timestamp)/60000)} minutes</p>
                <div style="text-align: center; margin-top: 25px;">
                  <a href="${ackUrl}" style="display: inline-block; background: #e11d48; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; border: 2px solid #000;">ACKNOWLEDGE AND SILENCE</a>
                </div>
             </div>
          </div>
        `;
        
        await this.sendEmail(`RE-ALERT: ${alert.service.toUpperCase()} FAILURE PERSISTS`, `The system is still in a critical state.`, html);
      }
    }
  }

  static postUrl(urlStr, payload) {
    try {
      const url = new URL(urlStr);
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {});
      req.on('error', (e) => Logger.log(`Webhook error: ${e.message}`, 'error'));
      req.write(payload);
      req.end();
    } catch(err) {
      Logger.log(`Failed to parse webhook URL: ${err.message}`, 'error');
    }
  }
}

module.exports = Alerter;
