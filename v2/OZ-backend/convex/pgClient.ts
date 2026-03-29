"use node";

/**
 * pgClient.ts — Shared PostgreSQL Connection Helper
 * ──────────────────────────────────────────────────
 * Used by Convex Actions (Node.js runtime) to talk to
 * the PostgreSQL source-of-truth database.
 *
 * Connection string is read from the `PG_URL` environment variable,
 * which must be set via the Convex Dashboard → Environment Variables.
 */

import { Pool, type PoolClient } from "pg";
import { ConvexError } from "convex/values";

// Pool is created once and reused across action invocations
// within the same Node.js process lifecycle.
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.PG_URL;
    if (!connectionString) {
      throw new ConvexError("DB_UNAVAILABLE");
    }
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    // Handle unexpected pool errors so the process doesn't crash
    pool.on("error", (err) => {
      console.error("⚠️  Unexpected PostgreSQL pool error:", err.message);
    });
  }
  return pool;
}

/**
 * Acquire a client from the pool.
 * On failure → throws ConvexError("DB_UNAVAILABLE")
 */
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await getPool().connect();
    return client;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ PostgreSQL connection failed:", message);
    throw new ConvexError("DB_UNAVAILABLE");
  }
}

/**
 * Execute a single query without managing a client manually.
 * Automatically acquires and releases a client.
 */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getClient();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ PostgreSQL query failed:", message);
    throw new ConvexError("DB_UNAVAILABLE");
  } finally {
    client.release();
  }
}
