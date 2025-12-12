import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { buildAuthRouter } from './auth.ts';
import { buildOrdersRouter } from './orders.ts';
import { buildChatRouter } from './chat.ts';
import { buildReportsRouter } from './reports.ts';
import { buildMotoboysRouter } from './motoboys.ts';
import { buildClientsRouter } from './clients.ts';
import { buildUsersRouter } from './users.ts';
import { buildAnalyticsRouter } from './analytics.ts';
import { buildUploadsRouter } from './uploads.ts';
import { buildHealthRouter } from './health.ts';
import { buildSchedulesRouter } from './schedules.ts';

export async function registerRoutes() {
  const router = Router();

  // Global rate limiter for API endpoints
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
  router.use('/api', apiLimiter);

  // Mount modular routers under /api
  router.use('/api', buildAuthRouter());  // /api/auth
  router.use('/api', buildOrdersRouter()); // /api/orders
  router.use('/api/chat', buildChatRouter()); // chat routes have their own base
  router.use('/api', buildReportsRouter()); // /api/company, /api/clients/:id, /api/motoboys/:id, /api/orders
  router.use('/api', buildMotoboysRouter()); // /api/motoboys
  router.use('/api', buildClientsRouter()); // /api/clients
  router.use('/api', buildUsersRouter()); // /api/users
  router.use('/api', buildAnalyticsRouter()); // /api/analytics
  router.use('/api', buildUploadsRouter()); // /api/upload
  router.use('/api', buildSchedulesRouter()); // /api/schedules

  // Health and readiness
  router.use(buildHealthRouter());

  return router;
}

export default registerRoutes;
