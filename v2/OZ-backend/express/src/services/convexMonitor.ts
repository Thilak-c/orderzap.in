import { EventEmitter } from "events";
import { isConvexHealthy } from "./convexClient.js";
import { restartConvex, waitForHealthy } from "./dockerManager.js";

/**
 * convexMonitor.ts — Convex Container Health Monitor
 * ───────────────────────────────────────────────────
 * Runs a background health check loop that monitors the Convex backend.
 * If the backend fails multiple consecutive checks, it automatically
 * triggers a Docker container restart.
 *
 * Events emitted:
 *   - convex:healthy     → Convex is responding
 *   - convex:unhealthy   → Health check failed (includes failure count)
 *   - convex:recovering  → Auto-restart triggered
 *   - convex:recovered   → Container is back online
 *   - convex:fatal       → Recovery failed
 */

export type ConvexStatus = "healthy" | "unhealthy" | "recovering" | "unknown";

class ConvexMonitor extends EventEmitter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private failureCount = 0;
  private _status: ConvexStatus = "unknown";
  private isRecovering = false;

  private readonly checkIntervalMs: number;
  private readonly maxFailures: number;

  constructor() {
    super();
    this.checkIntervalMs = parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || "10000", 10);
    this.maxFailures = parseInt(process.env.HEALTH_CHECK_MAX_FAILURES || "3", 10);
  }

  /** Current status of the Convex backend */
  get status(): ConvexStatus {
    return this._status;
  }

  /** Start the health check loop */
  start(): void {
    if (this.intervalId) {
      console.warn("⚠️  ConvexMonitor already running");
      return;
    }

    console.log(
      `🔍 Convex health monitor started (interval: ${this.checkIntervalMs}ms, max failures: ${this.maxFailures})`
    );

    // Run first check immediately
    this.runCheck();

    // Then schedule periodic checks
    this.intervalId = setInterval(() => this.runCheck(), this.checkIntervalMs);
  }

  /** Stop the health check loop */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🔍 Convex health monitor stopped");
    }
  }

  /** Run a single health check */
  private async runCheck(): Promise<void> {
    // Skip check if we're already in recovery mode
    if (this.isRecovering) return;

    const healthy = await isConvexHealthy();

    if (healthy) {
      // Reset failure count on success
      if (this.failureCount > 0 || this._status !== "healthy") {
        console.log("✅ Convex backend is healthy");
      }
      this.failureCount = 0;
      this._status = "healthy";
      this.emit("convex:healthy");
      return;
    }

    // Health check failed
    this.failureCount++;
    this._status = "unhealthy";
    console.warn(
      `⚠️  Convex health check failed (${this.failureCount}/${this.maxFailures})`
    );
    this.emit("convex:unhealthy", { failureCount: this.failureCount });

    // Trigger recovery if max failures reached
    if (this.failureCount >= this.maxFailures) {
      await this.triggerRecovery();
    }
  }

  /** Attempt to recover by restarting the Convex container */
  private async triggerRecovery(): Promise<void> {
    this.isRecovering = true;
    this._status = "recovering";
    console.log("🔄 Triggering Convex auto-recovery...");
    this.emit("convex:recovering");

    try {
      // Step 1: Restart the containers
      const result = await restartConvex();
      if (!result.success) {
        throw new Error(result.message);
      }

      // Step 2: Wait for the backend to become healthy
      const recovered = await waitForHealthy(60_000, 3_000);

      if (recovered) {
        this.failureCount = 0;
        this._status = "healthy";
        console.log("🎉 Convex auto-recovery successful!");
        this.emit("convex:recovered");
      } else {
        this._status = "unhealthy";
        console.error("❌ Convex auto-recovery failed — container did not become healthy");
        this.emit("convex:fatal", { message: "Recovery timeout" });
      }
    } catch (err) {
      this._status = "unhealthy";
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ Convex auto-recovery error:", message);
      this.emit("convex:fatal", { message });
    } finally {
      this.isRecovering = false;
      // Reset failure count so the monitor starts fresh
      this.failureCount = 0;
    }
  }
}

// Singleton instance
export const convexMonitor = new ConvexMonitor();
