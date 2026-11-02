const express = require('express');
const originalEnv = { ...process.env };

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(contentType) {
      this.headers['content-type'] = contentType;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandlers(app, method, path) {
  const router = app._router;
  if (!router) {
    throw new Error('Express router not initialized');
  }

  const layer = router.stack.find((entry) => entry.route && entry.route.path === path);
  if (!layer) {
    throw new Error(`Route ${path} not found`);
  }

  const routeLayer = layer.route.stack.find((entry) => entry.method === method.toLowerCase());
  if (!routeLayer) {
    throw new Error(`Method ${method} not found for ${path}`);
  }

  return layer.route.stack
    .filter((entry) => entry.method === method.toLowerCase())
    .map((entry) => entry.handle);
}

function getRouteHandler(app, method, path) {
  return getRouteHandlers(app, method, path).at(-1);
}

async function runRouteHandlers(app, method, path, req, res) {
  const handlers = getRouteHandlers(app, method, path);
  let index = 0;

  const next = async () => {
    const handler = handlers[index++];
    if (!handler) {
      return;
    }

    await handler(req, res, next);
  };

  await next();
}

function loadAppWithHealthChecks(checks, envOverrides = {}) {
  jest.resetModules();
  Object.assign(process.env, envOverrides);

  jest.doMock('../dist/src/shared/container', () => ({
    buildContainer: () => ({
      healthCheckService: { check: jest.fn().mockResolvedValue(checks) },
      authController: {},
      contribuablesController: {},
      transactionsController: {},
      dashboardController: {},
      portalController: {},
      placeholderController: {},
    }),
  }));

  const emptyRouterFactory = () => express.Router();
  jest.doMock('../dist/src/modules/auth/presentation/auth.routes', () => ({ buildAuthRoutes: emptyRouterFactory }));
  jest.doMock('../dist/src/modules/contribuables/presentation/contribuables.routes', () => ({ buildContribuablesRoutes: emptyRouterFactory }));
  jest.doMock('../dist/src/modules/transactions/presentation/transactions.routes', () => ({ buildTransactionsRoutes: emptyRouterFactory }));
  jest.doMock('../dist/src/modules/dashboard/presentation/dashboard.routes', () => ({ buildDashboardRoutes: emptyRouterFactory }));
  jest.doMock('../dist/src/modules/portal/presentation/portal.routes', () => ({ buildPortalRoutes: emptyRouterFactory }));
  jest.doMock('../dist/src/modules/placeholders/presentation/placeholders.routes', () => ({ buildPlaceholderRoutes: emptyRouterFactory }));

  const { createApp } = require('../dist/src/app');
  return createApp();
}

describe('createApp', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns OK payload on /health', async () => {
    const app = loadAppWithHealthChecks({ database: true, redis: true });
    const handler = getRouteHandler(app, 'GET', '/health');
    const res = createResponse();

    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('kafountine-backend');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 200 on /ready only when database and redis are up', async () => {
    const app = loadAppWithHealthChecks({ database: true, redis: true });
    const handler = getRouteHandler(app, 'GET', '/ready');
    const res = createResponse();

    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks).toEqual({ database: true, redis: true });
  });

  it('returns 503 on /ready when redis is down', async () => {
    const app = loadAppWithHealthChecks({ database: true, redis: false });
    const handler = getRouteHandler(app, 'GET', '/ready');
    const res = createResponse();

    await handler({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('not ready');
    expect(res.body.checks).toEqual({ database: true, redis: false });
  });

  it('returns prometheus-compatible payload on /metrics', async () => {
    const app = loadAppWithHealthChecks({ database: true, redis: true });
    const res = createResponse();

    await runRouteHandlers(app, 'GET', '/metrics', { header: () => undefined }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain');
    expect(res.body).toContain('# HELP kafontine_backend_up');
    expect(res.body).toContain('kafontine_backend_up 1');
    expect(res.body).toContain('kafontine_backend_uptime_seconds');
    expect(res.body).toContain('kafontine_backend_memory_rss_bytes');
  });

  it('requires bearer token for /metrics when enabled in production', async () => {
    const token = 'production_metrics_token_min_32_chars';
    const app = loadAppWithHealthChecks(
      { database: true, redis: true },
      {
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(40),
        JWT_REFRESH_SECRET: 'b'.repeat(40),
        CORS_ORIGIN: 'https://app.example.com',
        PORTAL_URL: 'https://app.example.com',
        PORTAL_OTP_DELIVERY_MODE: 'webhook',
        PORTAL_OTP_WEBHOOK_URL: 'https://sms.example.com/otp',
        PORTAL_OTP_WEBHOOK_TOKEN: 'otp-webhook-token',
        ENABLE_API_DOCS: 'false',
        ENABLE_METRICS: 'true',
        METRICS_BEARER_TOKEN: token,
      },
    );
    const unauthorizedRes = createResponse();

    await runRouteHandlers(app, 'GET', '/metrics', { header: () => undefined }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(401);

    const authorizedRes = createResponse();
    await runRouteHandlers(
      app,
      'GET',
      '/metrics',
      { header: (name) => (name === 'authorization' ? `Bearer ${token}` : undefined) },
      authorizedRes,
    );

    expect(authorizedRes.statusCode).toBe(200);
    expect(authorizedRes.body).toContain('kafontine_backend_up 1');
  });
});
