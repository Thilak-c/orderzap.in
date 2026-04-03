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
import orderRoutes from "./routes/orders.js";
import menuRoutes from "./routes/menu.js";

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
app.use("/api/orders", orderRoutes);
app.use("/api/menu", menuRoutes);

// Root route
app.get("/", (_req, res) => {
  res.json({
    name: "OrderZap API",
    version: "2.0.0",
    docs: {
      health: "GET /api/health",
      orders: {
        live: "GET /api/orders/live",
        place: "POST /api/orders",
        updateStatus: "PATCH /api/orders/:pgId/status",
      },
      menu: {
        list: "GET /api/menu",
        toggleStock: "PATCH /api/menu/:pgId/stock",
        sync: "POST /api/menu/sync",
      },
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Endpoint not found" });
});

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
  console.log(`  ⚡ Convex: ${process.env.CONVEX_URL || "http://127.0.0.1:3210"}`);
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
