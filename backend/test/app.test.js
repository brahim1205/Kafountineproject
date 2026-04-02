const express = require('express');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(app, method, path) {
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

  return routeLayer.handle;
}

function loadAppWithHealthChecks(checks) {
  jest.resetModules();

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
});
