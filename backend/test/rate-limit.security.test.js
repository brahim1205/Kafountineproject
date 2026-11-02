describe('rateLimit security', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../dist/src/shared/infrastructure/redis/getRedisClient', () => ({
      getRedisClient: jest.fn().mockResolvedValue(null),
    }));
  });

  function buildReq(ip, forwardedFor) {
    return {
      ip,
      header: (name) => (name.toLowerCase() === 'x-forwarded-for' ? forwardedFor : undefined),
    };
  }

  function buildRes() {
    return {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
    };
  }

  it('does not let clients bypass limits by rotating X-Forwarded-For', async () => {
    const { rateLimit } = require('../dist/src/shared/presentation/middleware/rateLimit');
    const middleware = rateLimit({ keyPrefix: 'test-spoof', windowMs: 60_000, max: 1 });

    const firstNext = jest.fn();
    middleware(buildReq('10.0.0.10', '203.0.113.1'), buildRes(), firstNext);
    await new Promise((resolve) => setImmediate(resolve));
    expect(firstNext).toHaveBeenCalledWith();

    const secondNext = jest.fn();
    const secondRes = buildRes();
    middleware(buildReq('10.0.0.10', '203.0.113.2'), secondRes, secondNext);
    await new Promise((resolve) => setImmediate(resolve));

    expect(secondRes.headers['Retry-After']).toBeGreaterThan(0);
    expect(secondNext.mock.calls[0][0].statusCode).toBe(429);
  });
});
