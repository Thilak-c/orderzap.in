import { Router } from 'express';
import menuRouter from './menu/index';
import healthRouter from './health';
import restaurantRouter from './restaurant/index';

/**
 * Main API Route Registrar
 * ────────────────────────
 * Root router mounted at /api in server.ts.
 * All menu features are scoped to a :restaurantId via SaaS-style paths.
 */
const mainRouter = Router();

// Standard health check (not restaurant-scoped)
mainRouter.use('/health', healthRouter);

// Restaurant management (onboarding)
mainRouter.use('/restaurant', restaurantRouter);

// Scope all menu features to a restaurant
mainRouter.use('/:restaurantId/menu', menuRouter);

// API root info
mainRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "OrderZap SaaS API",
      version: "1.0.0",
      description: "Focus: Menu Management",
      usage: "GET /api/:restaurantId/menu/items"
    }
  });
});

export default mainRouter;
