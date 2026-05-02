import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { buildContainer } from './shared/container';
import { env } from './shared/config/env';
import { errorHandler } from './shared/presentation/middleware/errorHandler';
import { csrfProtection } from './shared/presentation/middleware/csrfProtection';
import { rateLimit } from './shared/presentation/middleware/rateLimit';
import { requestLogger } from './shared/presentation/middleware/requestLogger';
import { buildAuthRoutes } from './modules/auth/presentation/auth.routes';
import { buildContribuablesRoutes } from './modules/contribuables/presentation/contribuables.routes';
import { buildTransactionsRoutes } from './modules/transactions/presentation/transactions.routes';
import { buildDashboardRoutes } from './modules/dashboard/presentation/dashboard.routes';
import { buildPortalRoutes } from './modules/portal/presentation/portal.routes';
import { buildPlaceholderRoutes } from './modules/placeholders/presentation/placeholders.routes';
import { swaggerSpec } from './config/swagger';

function buildMetricsPayload() {
  const memoryUsage = process.memoryUsage();
  const lines = [
    '# HELP kafontine_backend_up Backend process health status.',
    '# TYPE kafontine_backend_up gauge',
    'kafontine_backend_up 1',
    '# HELP kafontine_backend_uptime_seconds Backend uptime in seconds.',
    '# TYPE kafontine_backend_uptime_seconds counter',
    `kafontine_backend_uptime_seconds ${process.uptime().toFixed(3)}`,
    '# HELP kafontine_backend_memory_rss_bytes Resident memory usage in bytes.',
    '# TYPE kafontine_backend_memory_rss_bytes gauge',
    `kafontine_backend_memory_rss_bytes ${memoryUsage.rss}`,
    '# HELP kafontine_backend_heap_used_bytes Heap used in bytes.',
    '# TYPE kafontine_backend_heap_used_bytes gauge',
    `kafontine_backend_heap_used_bytes ${memoryUsage.heapUsed}`,
  ];

  return `${lines.join('\n')}\n`;
}

export function createApp() {
  const app = express();
  const container = buildContainer();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  if (env.compressionEnabled) {
    app.use(compression());
  }
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use(csrfProtection);
  app.use('/api', rateLimit({
    keyPrefix: 'api-global',
    windowMs: env.apiRateLimitWindowMs,
    max: env.apiRateLimitMax,
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'kafountine-backend' });
  });

  app.get('/ready', async (_req, res) => {
    const checks = await container.healthCheckService.check();
    const isReady = checks.database && checks.redis;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not ready',
      checks,
    });
  });

  if (env.enableMetrics) {
    app.get('/metrics', (_req, res) => {
      res.type('text/plain').send(buildMetricsPayload());
    });
  }

  if (env.enableApiDocs) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use('/api/v1/auth', buildAuthRoutes(container.authController));
  app.use('/api/v1/contribuables', buildContribuablesRoutes(container.contribuablesController));
  app.use('/api/v1/transactions', buildTransactionsRoutes(container.transactionsController));
  app.use('/api/v1/dashboard', buildDashboardRoutes(container.dashboardController));
  app.use('/api/v1/portal', buildPortalRoutes(container.portalController));
  app.use('/api/v1', buildPlaceholderRoutes(container.placeholderController));

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route non trouvée' });
  });

  app.use(errorHandler);

  return app;
}

