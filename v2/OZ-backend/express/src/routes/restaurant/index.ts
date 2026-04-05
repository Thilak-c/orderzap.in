import { Router } from 'express';
import createRouter from './create';

/**
 * Restaurant Router Registrar
 * ───────────────────────────
 * Parent router for restaurant registration and management.
 */
const restaurantRouter = Router();

// Endpoint: POST /api/restaurant/
restaurantRouter.use('/', createRouter);

export default restaurantRouter;
