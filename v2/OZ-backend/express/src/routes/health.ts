import { Router, Request, Response } from "express";
import { testConnection } from "../config/database.js";
import { isConvexHealthy } from "../services/convexClient.js";
import { getContainerStatus } from "../services/dockerManager.js";
import { convexMonitor } from "../services/convexMonitor.js";

/**
 * health.ts — Health Check Route
 * ──────────────────────────────
 * GET /api/health — No API key required.
 * Returns the status of all system components.
 */

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const [pgHealthy, convexHealthy, containers] = await Promise.all([
    testConnection(),
    isConvexHealthy(),
    getContainerStatus(),
  ]);

  const overall =
    pgHealthy && convexHealthy ? "healthy" : pgHealthy ? "degraded" : "unhealthy";

  res.json({
    status: overall,
    timestamp: new Date().toISOString(),
    services: {
      express: { status: "healthy" },
      postgresql: { status: pgHealthy ? "healthy" : "unhealthy" },
      convex: {
        status: convexHealthy ? "healthy" : "unhealthy",
        monitorStatus: convexMonitor.status,
      },
      docker: {
        containers: containers.map((c) => ({
          name: c.name,
          state: c.state,
          health: c.health || "unknown",
        })),
      },
    },
  });
});

export default router;
