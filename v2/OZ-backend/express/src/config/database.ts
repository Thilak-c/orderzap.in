import { Pool, type PoolClient } from "pg";

/**
 * database.ts — PostgreSQL Connection Pool
 * ─────────────────────────────────────────
 * Shared pool used by the Express API routes to query PostgreSQL directly.
 * This is the source-of-truth database — the frontend never touches it.
 */

const pool = new Pool({
  connectionString: process.env.PG_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("⚠️  Unexpected PostgreSQL pool error:", err.message);
});

/**
 * Execute a parameterized query and return typed rows.
 */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Get a client from the pool (for transactions).
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Test the PostgreSQL connection. Returns true if healthy.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export default pool;
