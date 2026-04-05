/**
 * Vitest Setup File
 * ─────────────────────────────────────────
 * Loads environment variables before running tests
 */

import 'dotenv/config';

console.log('✓ Environment variables loaded for tests');
console.log(`  PG_URL: ${process.env.PG_URL ? 'configured' : '⚠️  NOT SET'}`);
