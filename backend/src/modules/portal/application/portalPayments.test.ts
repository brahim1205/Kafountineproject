const mockEnv = { portalOnlinePayments: false };
jest.mock('../../../shared/config/env', () => ({ env: mockEnv }));

import { assertPortalPaymentsEnabled, portalPaymentsAvailability } from './portalPayments';

describe('paiements en ligne du portail', () => {
  it('sont refusés (503) tant qu’aucun opérateur ne confirme les encaissements', () => {
    mockEnv.portalOnlinePayments = false;

    expect(() => assertPortalPaymentsEnabled()).toThrow(expect.objectContaining({ statusCode: 503 }));
    expect(portalPaymentsAvailability()).toEqual({ enabled: false, message: expect.stringContaining('guichet') });
  });

  it('restent possibles en développement', () => {
    mockEnv.portalOnlinePayments = true;

    expect(() => assertPortalPaymentsEnabled()).not.toThrow();
    expect(portalPaymentsAvailability()).toEqual({ enabled: true, message: null });
  });
});
