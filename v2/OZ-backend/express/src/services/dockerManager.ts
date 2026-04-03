import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

/**
 * dockerManager.ts — Docker Container Lifecycle Manager
 * ──────────────────────────────────────────────────────
 * Manages Convex Docker containers programmatically.
 * Used by the health monitor to auto-restart containers
 * when they become unhealthy.
 */

const execAsync = promisify(exec);

// Project root where docker-compose.yml lives
const PROJECT_ROOT = path.resolve(
  import.meta.dirname || process.cwd(),
  "../../"
);

interface ContainerStatus {
  name: string;
  state: string;
  status: string;
  health?: string;
}

/**
 * Restart the Convex backend and dashboard containers.
 * Uses --force-recreate to ensure a clean start.
 */
export async function restartConvex(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("🐳 Restarting Convex containers...");

    const { stdout, stderr } = await execAsync(
      "docker compose up -d --force-recreate backend dashboard",
      {
        cwd: PROJECT_ROOT,
        timeout: 60_000, // 60s timeout
      }
    );

    if (stderr && !stderr.includes("Started") && !stderr.includes("Created") && !stderr.includes("Running")) {
      // docker compose often writes progress to stderr — only warn on real errors
      console.warn("🐳 Docker stderr:", stderr.trim());
    }

    console.log("🐳 Docker compose output:", stdout.trim());
    return { success: true, message: "Containers restarted" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Failed to restart Convex containers:", message);
    return { success: false, message };
  }
}

/**
 * Get the status of all Docker Compose containers.
 */
export async function getContainerStatus(): Promise<ContainerStatus[]> {
  try {
    const { stdout } = await execAsync(
      'docker compose ps --format "{{.Name}}|{{.State}}|{{.Status}}"',
      {
        cwd: PROJECT_ROOT,
        timeout: 10_000,
      }
    );

    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const [name, state, status] = line.split("|");
      const health = status?.includes("(healthy)")
        ? "healthy"
        : status?.includes("(unhealthy)")
          ? "unhealthy"
          : status?.includes("(health: starting)")
            ? "starting"
            : undefined;

      return { name, state, status, health };
    });
  } catch {
    return [];
  }
}

/**
 * Wait for the Convex backend to become healthy.
 * Polls the /version endpoint with a timeout.
 */
export async function waitForHealthy(
  maxWaitMs: number = 30_000,
  intervalMs: number = 2_000
): Promise<boolean> {
  const start = Date.now();
  const convexUrl = process.env.CONVEX_URL || "http://127.0.0.1:3210";

  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await fetch(`${convexUrl}/version`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        console.log("✅ Convex backend is healthy again");
        return true;
      }
    } catch {
      // Still not ready, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.error("❌ Convex backend did not become healthy within timeout");
  return false;
}
