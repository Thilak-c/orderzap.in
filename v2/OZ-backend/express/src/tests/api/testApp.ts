import express, { Express } from 'express';
import { apiKeyAuth } from '../../middleware/apiKeyAuth';
import v2Router from '../../routes/v2/index';
import { errorHandler } from '../../middleware/errorHandler';

/**
 * Creates an isolated Express API instance exclusively for testing V2 routes.
 * Avoids EADDRINUSE conflicts and skips websocket/convex bloat present in server.ts.
 */
export function createTestApp(): Express {
  const app = express();
  
  // Set the dummy API key for testing environment
  process.env.API_KEY = 'test_api_key_123';
  
  app.use(express.json());
  app.use('/api', apiKeyAuth);
  app.use('/api/v2', v2Router);
  
  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
  });

  // Centralized Error handler
  app.use(errorHandler);
  
  return app;
}
