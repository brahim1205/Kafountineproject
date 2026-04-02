describe('Portal use cases', () => {
  it('stores a pending portal payment before redirecting the user', async () => {
    const { InitiatePortalPaymentUseCase } = require('../dist/src/modules/portal/application/InitiatePortalPaymentUseCase');

    const repository = {
      findPortalPayables: jest.fn().mockResolvedValue([
        { id: 'tx-1', numero: 'TX-1', montant: 10000, statut: 'EN_ATTENTE' },
        { id: 'tx-2', numero: 'TX-2', montant: 5000, statut: 'EN_ATTENTE' },
      ]),
    };
    const paymentStore = { save: jest.fn().mockResolvedValue(undefined) };

    const useCase = new InitiatePortalPaymentUseCase(repository, paymentStore);

    const result = await useCase.execute({
      amount: 15000,
      phone: '+221771234567',
      method: 'wave',
      taxes: ['tx-1', 'tx-2'],
    }, 'contrib-1');

    expect(repository.findPortalPayables).toHaveBeenCalledWith('contrib-1', ['tx-1', 'tx-2']);
    expect(paymentStore.save).toHaveBeenCalledWith(expect.objectContaining({
      contribuableId: 'contrib-1',
      taxIds: ['tx-1', 'tx-2'],
      amount: 15000,
      phone: '+221771234567',
      method: 'wave',
    }));
    expect(result.success).toBe(true);
    expect(result.paymentId).toMatch(/^PAY-/);
    expect(result.transactionId).toBe(result.paymentId);
    expect(result.paymentUrl).toContain('status=success');
  });

  it('confirms a pending portal payment and marks the selected taxes as paid', async () => {
    const { ConfirmPortalPaymentUseCase } = require('../dist/src/modules/portal/application/ConfirmPortalPaymentUseCase');

    const paymentStore = {
      find: jest.fn().mockResolvedValue({
        paymentId: 'PAY-123',
        contribuableId: 'contrib-1',
        taxIds: ['tx-1', 'tx-2'],
        amount: 15000,
        phone: '+221771234567',
        method: 'wave',
        createdAt: '2026-04-01T00:00:00.000Z',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      markPortalPaymentAsPaid: jest.fn().mockResolvedValue([
        { id: 'tx-1', numero: 'TX-1', montant: 10000, statut: 'PAYE', service: 'Taxe municipale', date: new Date('2026-04-01T10:00:00.000Z') },
        { id: 'tx-2', numero: 'TX-2', montant: 5000, statut: 'PAYE', service: 'Taxe moto', date: new Date('2026-04-01T10:00:00.000Z') },
      ]),
    };

    const useCase = new ConfirmPortalPaymentUseCase(paymentStore, repository);
    const result = await useCase.execute({ transactionId: 'PAY-123' }, 'contrib-1');

    expect(repository.markPortalPaymentAsPaid).toHaveBeenCalledWith('contrib-1', ['tx-1', 'tx-2'], 'MOBILE_MONEY');
    expect(paymentStore.delete).toHaveBeenCalledWith('PAY-123');
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('tx-1');
    expect(result.transactionIds).toEqual(['tx-1', 'tx-2']);
  });

  it('rejects confirmation when the payment belongs to another contribuable', async () => {
    const { ConfirmPortalPaymentUseCase } = require('../dist/src/modules/portal/application/ConfirmPortalPaymentUseCase');

    const paymentStore = {
      find: jest.fn().mockResolvedValue({
        paymentId: 'PAY-123',
        contribuableId: 'contrib-2',
        taxIds: ['tx-1'],
        amount: 10000,
        phone: '+221771234567',
        method: 'wave',
        createdAt: '2026-04-01T00:00:00.000Z',
      }),
      delete: jest.fn(),
    };
    const repository = {
      markPortalPaymentAsPaid: jest.fn(),
    };

    const useCase = new ConfirmPortalPaymentUseCase(paymentStore, repository);

    await expect(useCase.execute({ transactionId: 'PAY-123' }, 'contrib-1'))
      .rejects.toThrow('Ce paiement ne vous appartient pas');
  });

  it('registers a contribuable and returns a portal token', async () => {
    const { RegisterPortalContribuableUseCase } = require('../dist/src/modules/portal/application/RegisterPortalContribuableUseCase');

    const repository = {
      findByNin: jest.fn().mockResolvedValue(null),
      findByTelephone: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'contrib-1',
        nom: 'Sow',
        prenom: 'Awa',
        nin: 'NIN-001',
        telephone: '+221771234567',
      }),
    };
    const tokenService = {
      signPortalToken: jest.fn().mockReturnValue('portal-token'),
    };

    const useCase = new RegisterPortalContribuableUseCase(repository, tokenService);

    const result = await useCase.execute({
      nin: 'NIN-001',
      nom: 'Sow',
      prenom: 'Awa',
      telephone: '+221771234567',
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      nin: 'NIN-001',
      nom: 'Sow',
      prenom: 'Awa',
      telephone: '+221771234567',
      typeContribuable: 'PARTICULIER',
    }));
    expect(tokenService.signPortalToken).toHaveBeenCalledWith({
      id: 'contrib-1',
      role: 'CONTRIBUABLE',
    });
    expect(result).toEqual({
      token: 'portal-token',
      contribuable: {
        id: 'contrib-1',
        nom: 'Sow',
        prenom: 'Awa',
        nin: 'NIN-001',
        telephone: '+221771234567',
      },
    });
  });

  it('maps portal transaction history to the mobile contract', async () => {
    const { GetPortalTransactionsUseCase } = require('../dist/src/modules/portal/application/GetPortalTransactionsUseCase');

    const repository = {
      findByContribuableId: jest.fn().mockResolvedValue([
        {
          id: 'tx-1',
          numero: 'TX-2026-001',
          service: 'Taxe municipale',
          montant: 15000,
          statut: 'PAYE',
          date: new Date('2026-03-15T10:00:00.000Z'),
        },
      ]),
    };

    const useCase = new GetPortalTransactionsUseCase(repository);
    const result = await useCase.execute('contrib-1');

    expect(result).toEqual([
      {
        id: 'tx-1',
        numero: 'TX-2026-001',
        montant: 15000,
        statut: 'PAYE',
        createdAt: '2026-03-15T10:00:00.000Z',
        service: 'Taxe municipale',
      },
    ]);
  });

  it('returns a receipt payload for an existing transaction', async () => {
    const { GetPortalReceiptUseCase } = require('../dist/src/modules/portal/application/GetPortalReceiptUseCase');

    const repository = {
      findDetailsById: jest.fn().mockResolvedValue({
        id: 'tx-1',
        numero: 'TX-2026-001',
        categorie: 'TAXE',
        service: 'Taxe municipale',
        montant: 15000,
        statut: 'PAYE',
        modePaiement: 'MOBILE_MONEY',
        date: new Date('2026-03-15T10:00:00.000Z'),
        contribuable: {
          id: 'contrib-1',
          nom: 'Sow',
          prenom: 'Awa',
          nin: 'NIN-001',
          telephone: '+221771234567',
        },
      }),
    };

    const useCase = new GetPortalReceiptUseCase(repository);
    const result = await useCase.execute('tx-1', 'contrib-1');

    expect(result).toEqual({
      id: 'tx-1',
      numero: 'TX-2026-001',
      date: '2026-03-15T10:00:00.000Z',
      montant: 15000,
      statut: 'PAYE',
      service: 'Taxe municipale',
      categorie: 'TAXE',
      modePaiement: 'MOBILE_MONEY',
      contribuable: {
        id: 'contrib-1',
        nom: 'Sow',
        prenom: 'Awa',
        nin: 'NIN-001',
        telephone: '+221771234567',
      },
    });
  });
});
