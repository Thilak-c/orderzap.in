import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
import { initSocketServer, emitConvexStatus } from "./services/realtimeRelay.js";
import { convexMonitor } from "./services/convexMonitor.js";
import healthRoutes from "./routes/health.js";
import mainRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

/**
 * server.ts — OrderZap Express API Gateway
 * ─────────────────────────────────────────
 * Single entry point for the frontend. Provides:
 * - REST API for orders and menu (API key protected)
 * - WebSocket (Socket.io) for real-time updates
 * - Health monitoring with auto-recovery for Convex
 * - PostgreSQL fallback when Convex is unavailable
 * - Detailed file-based telemetry for OZ Monitor
 */

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const LOG_DIR = "/app/logs";
const LOG_FILE = path.join(LOG_DIR, "access.log");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Middleware ─────────────────────────────────────

app.use(cors({ origin: "*" })); // React Native doesn't have a fixed origin
app.use(express.json());

// Trust proxy if we are behind a reverse proxy (e.g., Docker, Nginx)
app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "TOO_MANY_REQUESTS", message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all requests
// app.use(apiLimiter);

// Detailed Request Telemetry Logging for OZ Monitor
app.use((req, res, next) => {
  const start = process.hrtime();
  const reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown IP';
  const reqUa = req.get('User-Agent') || 'unknown client';
  const reqPort = req.socket.localPort || PORT; // Track the server access port
  
  res.on("finish", () => {
    const diff = process.hrtime(start);
    const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    const payload = JSON.stringify({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency: latencyMs,
      ip: reqIp,
      port: reqPort,
      reason: reqUa
    });
    
    // Log to console (docker logs)
    console.log(`[TRACE] ${payload}`);
    
    // Log to persistent file
    try {
      fs.appendFileSync(LOG_FILE, payload + "\n");
    } catch (err) {
      console.error("Failed to write to access.log", err);
    }
  });
  next();
});

// API key authentication (exempts /api/health)
app.use("/api", apiKeyAuth);

// ── Routes ────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api", mainRouter);

// Root route — HTML API explorer
app.get("/", (_req, res) => {
  const docsPath = path.join(process.cwd(), "express", "API_DOCS.md");
  let mdContent = "API Documentation not found.";
  try {
    mdContent = fs.readFileSync(docsPath, "utf-8");
  } catch(e) {
    console.error("Could not read API_DOCS.md", e);
  }
  
  res.setHeader("Content-Type", "text/html");
  const safeMd = mdContent.replace(/<\/script>/gi, '<\\/script>');
  
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OrderZap API Explorer</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-dark.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      background-color: #0d1117;
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    }
    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
    }
    @media (max-width: 767px) {
      body { padding: 15px; }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #30363d;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #f97316, #fb923c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-family: system-ui, sans-serif;
    }
    .badge {
      background: #1f2937;
      color: #9ca3af;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-family: sans-serif;
      border: 1px solid #374151;
    }
    .live-status {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #4ade80;
      font-family: sans-serif;
    }
    .dot {
      width: 8px; height: 8px; background: #4ade80; border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">API</div>
    <div class="badge">v2.0.0</div>
    <div class="live-status"><div class="dot"></div> Live :4000</div>
  </div>
  <script type="text/markdown" id="md-content">
` + safeMd + `
  </script>
  <article class="markdown-body" id="content-area"></article>

  <script>
    const markdownText = document.getElementById('md-content').textContent;
    document.getElementById('content-area').innerHTML = marked.parse(markdownText);
  </script>
</body>
</html>`);
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Endpoint not found" });
});

// Global error handler (must be last)
app.use(errorHandler);

// ── HTTP + WebSocket Server ───────────────────────

const httpServer = createServer(app);
initSocketServer(httpServer);

// ── Convex Health Monitor ─────────────────────────

convexMonitor.on("convex:healthy", () => {
  emitConvexStatus("healthy");
});

convexMonitor.on("convex:unhealthy", ({ failureCount }) => {
  emitConvexStatus(`unhealthy (failures: ${failureCount})`);
});

convexMonitor.on("convex:recovering", () => {
  console.log("🔄 Auto-recovery in progress — Express continues serving via PostgreSQL");
  emitConvexStatus("recovering");
});

convexMonitor.on("convex:recovered", () => {
  console.log("🎉 Convex is back online — switching to real-time mode");
  emitConvexStatus("healthy");
});

convexMonitor.on("convex:fatal", ({ message }) => {
  console.error(`🚨 Convex recovery failed: ${message}`);
  emitConvexStatus(`fatal: ${message}`);
});

// ── Start ─────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🚀 OrderZap API Gateway");
  console.log(`  📡 HTTP + WebSocket: http://localhost:${PORT}`);
  console.log(`  🔑 API Key: ${process.env.API_KEY ? "configured" : "⚠️  NOT SET"}`);
  console.log(`  🐘 PostgreSQL: ${process.env.PG_URL ? "configured" : "⚠️  NOT SET"}`);
  console.log(`   Convex: ${process.env.CONVEX_URL || "http://127.0.0.1:3210"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Start the Convex health monitor
  convexMonitor.start();
});

// ── Graceful Shutdown ─────────────────────────────

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down OrderZap API...");
  convexMonitor.stop();
  httpServer.close(() => {
    console.log("👋 Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM received");
  convexMonitor.stop();
  httpServer.close(() => process.exit(0));
});
