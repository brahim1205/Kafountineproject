describe('portal schemas', () => {
  it('requires both NIN and phone number for login', () => {
    const { portalLoginSchema, portalOtpVerifySchema } = require('../dist/src/modules/portal/presentation/portal.schemas');

    expect(portalLoginSchema.safeParse({ nin: 'NIN-001', telephone: '+221771234567' }).success).toBe(true);
    expect(portalLoginSchema.safeParse({ nin: 'NIN-001' }).success).toBe(false);
    expect(portalLoginSchema.safeParse({ telephone: '+221771234567' }).success).toBe(false);
    expect(portalLoginSchema.safeParse({}).success).toBe(false);

    expect(portalOtpVerifySchema.safeParse({
      requestId: '89c24b74-6e12-44ff-8f7c-17d38488b55d',
      code: '123456',
    }).success).toBe(true);
    expect(portalOtpVerifySchema.safeParse({
      requestId: '89c24b74-6e12-44ff-8f7c-17d38488b55d',
      code: 'abc',
    }).success).toBe(false);
  });

  it('accepts the mobile payment initiate payload', () => {
    const { portalPaymentInitiateSchema, portalPaymentConfirmSchema } = require('../dist/src/modules/portal/presentation/portal.schemas');

    expect(portalPaymentInitiateSchema.safeParse({
      amount: 20000,
      phone: '+221771234567',
      method: 'wave',
      taxes: ['tx-1', 'tx-2'],
    }).success).toBe(true);

    expect(portalPaymentConfirmSchema.safeParse({
      transactionId: 'PAY-12345',
    }).success).toBe(true);
  });
});
