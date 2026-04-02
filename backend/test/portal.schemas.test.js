describe('portal schemas', () => {
  it('accepts login with only a NIN or a phone number', () => {
    const { portalLoginSchema } = require('../dist/src/modules/portal/presentation/portal.schemas');

    expect(portalLoginSchema.safeParse({ nin: 'NIN-001' }).success).toBe(true);
    expect(portalLoginSchema.safeParse({ telephone: '+221771234567' }).success).toBe(true);
    expect(portalLoginSchema.safeParse({}).success).toBe(false);
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
