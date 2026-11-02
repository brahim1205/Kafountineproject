describe('production environment security guardrails', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(40),
      JWT_REFRESH_SECRET: 'b'.repeat(40),
      TRUST_PROXY: 'loopback,linklocal,uniquelocal',
      CORS_ORIGIN: 'https://app.example.com',
      PORTAL_URL: 'https://app.example.com',
      PORTAL_OTP_DELIVERY_MODE: 'webhook',
      PORTAL_OTP_WEBHOOK_URL: 'https://sms.example.com/otp',
      PORTAL_OTP_WEBHOOK_TOKEN: 'otp-webhook-token',
      ENABLE_API_DOCS: 'false',
      ENABLE_METRICS: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects weak production JWT secrets', () => {
    process.env.JWT_SECRET = 'too-short';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/32 caractères/);
  });

  it('rejects wildcard CORS in production', () => {
    process.env.CORS_ORIGIN = '*';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/CORS_ORIGIN/);
  });

  it('rejects broad trust proxy settings in production', () => {
    process.env.TRUST_PROXY = '1';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/TRUST_PROXY/);

    jest.resetModules();
    process.env.TRUST_PROXY = 'true';
    expect(() => require('../dist/src/shared/config/env')).toThrow(/TRUST_PROXY/);
  });

  it('rejects dev OTP delivery in production', () => {
    process.env.PORTAL_OTP_DELIVERY_MODE = 'dev';
    process.env.PORTAL_OTP_WEBHOOK_URL = '';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/PORTAL_OTP_DELIVERY_MODE/);
  });

  it('rejects invalid cookie same-site policy in production', () => {
    process.env.COOKIE_SAME_SITE = 'wide-open';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/COOKIE_SAME_SITE/);
  });

  it('rejects enabled API docs in production', () => {
    process.env.ENABLE_API_DOCS = 'true';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/ENABLE_API_DOCS/);
  });

  it('requires an OTP webhook token in production', () => {
    process.env.PORTAL_OTP_WEBHOOK_TOKEN = '';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/PORTAL_OTP_WEBHOOK_TOKEN/);
  });

  it('requires a strong metrics bearer token when production metrics are enabled', () => {
    process.env.ENABLE_METRICS = 'true';
    process.env.METRICS_BEARER_TOKEN = 'too-short';

    expect(() => require('../dist/src/shared/config/env')).toThrow(/METRICS_BEARER_TOKEN/);
  });

  it('accepts explicit HTTPS production settings', () => {
    const { env } = require('../dist/src/shared/config/env');

    expect(env.isProduction).toBe(true);
    expect(env.corsOrigin).toEqual(['https://app.example.com']);
  });
});
