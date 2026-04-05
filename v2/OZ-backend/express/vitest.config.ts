import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load env from the OZ-backend root .env
config({ path: resolve(__dirname, '../.env') });

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 15_000,
    include: ['src/tests/**/*.test.ts'],
  },
});
