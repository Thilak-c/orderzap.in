/**
 * convexClient.ts — Convex HTTP API Client
 * ─────────────────────────────────────────
 * Communicates with the self-hosted Convex backend via its HTTP API.
 * Used by Express routes to read from Convex (real-time mirror) and
 * trigger actions/mutations.
 *
 * If Convex is unreachable, methods return null so the caller can
 * fall back to PostgreSQL.
 */

const CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY || "";

interface ConvexResponse<T = unknown> {
  status: "success" | "error";
  value?: T;
  errorMessage?: string;
}

/**
 * Call a Convex query function via HTTP.
 * Returns null if Convex is unreachable.
 */
export async function queryConvex<T = unknown>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const url = `${CONVEX_URL}/api/query`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${CONVEX_ADMIN_KEY}`,
      },
      body: JSON.stringify({
        path: functionPath,
        args,
        format: "json",
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.warn(`⚠️  Convex query ${functionPath} returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ConvexResponse<T>;

    if (data.status === "error") {
      console.warn(`⚠️  Convex query error: ${data.errorMessage}`);
      return null;
    }

    return data.value ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  Convex unreachable (query ${functionPath}): ${message}`);
    return null;
  }
}

/**
 * Call a Convex mutation function via HTTP.
 * Returns null if Convex is unreachable.
 */
export async function mutationConvex<T = unknown>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const url = `${CONVEX_URL}/api/mutation`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${CONVEX_ADMIN_KEY}`,
      },
      body: JSON.stringify({
        path: functionPath,
        args,
        format: "json",
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.warn(`⚠️  Convex mutation ${functionPath} returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ConvexResponse<T>;

    if (data.status === "error") {
      console.warn(`⚠️  Convex mutation error: ${data.errorMessage}`);
      return null;
    }

    return data.value ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  Convex unreachable (mutation ${functionPath}): ${message}`);
    return null;
  }
}

/**
 * Call a Convex action function via HTTP.
 * Returns null if Convex is unreachable.
 */
export async function actionConvex<T = unknown>(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    const url = `${CONVEX_URL}/api/action`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${CONVEX_ADMIN_KEY}`,
      },
      body: JSON.stringify({
        path: functionPath,
        args,
        format: "json",
      }),
      signal: AbortSignal.timeout(10_000), // Actions may take longer
    });

    if (!response.ok) {
      console.warn(`⚠️  Convex action ${functionPath} returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ConvexResponse<T>;

    if (data.status === "error") {
      console.warn(`⚠️  Convex action error: ${data.errorMessage}`);
      return null;
    }

    return data.value ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  Convex unreachable (action ${functionPath}): ${message}`);
    return null;
  }
}

/**
 * Check if Convex is reachable by hitting /version.
 */
export async function isConvexHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${CONVEX_URL}/version`, {
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
