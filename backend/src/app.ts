import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { buildContainer } from './shared/container';
import { env } from './shared/config/env';
import { errorHandler } from './shared/presentation/middleware/errorHandler';
import { requestLogger } from './shared/presentation/middleware/requestLogger';
import { buildAuthRoutes } from './modules/auth/presentation/auth.routes';
import { buildContribuablesRoutes } from './modules/contribuables/presentation/contribuables.routes';
import { buildTransactionsRoutes } from './modules/transactions/presentation/transactions.routes';
import { buildDashboardRoutes } from './modules/dashboard/presentation/dashboard.routes';
import { buildPortalRoutes } from './modules/portal/presentation/portal.routes';
import { buildPlaceholderRoutes } from './modules/placeholders/presentation/placeholders.routes';

export function createApp() {
  const app = express();
  const container = buildContainer();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'Kafountine Backend API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./src/modules/**/presentation/*.routes.ts', './src/modules/**/presentation/*Controller.ts'],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
