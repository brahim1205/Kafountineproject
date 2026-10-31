const { validate } = require('../dist/src/shared/presentation/middleware/validation');
const { loginSchema } = require('../dist/src/modules/auth/presentation/auth.schemas');
const { dashboardStatisticsQuerySchema, portalPaymentInitiateSchema } = require('../dist/src/modules/portal/presentation/portal.schemas');

describe('HTTP validation contract', () => {
  it('normalizes credentials and preserves the middleware success contract', () => {
    const req = { body: { email: ' ADMIN@EXAMPLE.COM ', password: 'Password123!' } };
    const next = jest.fn();
    validate(loginSchema)(req, {}, next);
    expect(req.body.email).toBe('admin@example.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects unexpected credential fields', () => {
    expect(loginSchema.safeParse({ email: 'admin@example.com', password: 'Password123!', role: 'ADMIN' }).success).toBe(false);
  });

  it('coerces valid query values and rejects out-of-range years', () => {
    const req = { query: { year: '2026' } };
    const next = jest.fn();
    validate(dashboardStatisticsQuerySchema, 'query')(req, {}, next);
    expect(req.query.year).toBe(2026);
    expect(next).toHaveBeenCalledWith();
    expect(dashboardStatisticsQuerySchema.safeParse({ year: '1999' }).success).toBe(false);
  });

  it('returns validation errors without replacing invalid request data', () => {
    const body = { amount: -1, taxes: Array(51).fill('tx-1') };
    const req = { body };
    const next = jest.fn();
    validate(portalPaymentInitiateSchema)(req, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(req.body).toBe(body);
  });
});
