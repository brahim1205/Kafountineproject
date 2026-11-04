import type { TransactionRepository } from '../domain/TransactionRepository';
import { GetTransactionStatisticsUseCase } from './GetTransactionStatisticsUseCase';

const now = new Date('2026-11-04T10:00:00');
const tx = (montant: number, statut: string, categorie: string, date: string) => ({ montant, statut, categorie, date: new Date(date) });

describe('GetTransactionStatisticsUseCase', () => {
  const findByYear = jest.fn();
  const useCase = new GetTransactionStatisticsUseCase({ findByYear } as unknown as TransactionRepository);

  beforeEach(() => {
    findByYear.mockResolvedValue([
      tx(1000, 'PAYE', 'Marché', '2026-11-04T08:00:00'),
      tx(3000, 'PAYE', 'Urbanisme', '2026-11-02T09:00:00'),
      tx(500, 'EN_ATTENTE', 'Marché', '2026-11-04T09:00:00'),
      tx(6000, 'PAYE', 'Marché', '2026-03-10T09:00:00'),
      tx(700, 'ANNULE', 'Marché', '2026-03-11T09:00:00'),
    ]);
  });

  it('découpe les recettes encaissées par jour, mois et année', async () => {
    const stats = await useCase.execute(2026, now);

    expect(stats.aujourdhui).toMatchObject({ total: 1000, transactions: 1 });
    expect(stats.mois).toMatchObject({ total: 4000, transactions: 2 });
    expect(stats.annee).toMatchObject({ total: 10000, transactions: 3 });
  });

  it('répartit les recettes par catégorie, de la plus grosse à la plus petite', async () => {
    const { annee } = await useCase.execute(2026, now);

    expect(annee.categories).toEqual([
      { nom: 'Marché', montant: 7000, pourcentage: 70 },
      { nom: 'Urbanisme', montant: 3000, pourcentage: 30 },
    ]);
  });

  it('conserve les champs historiques', async () => {
    await expect(useCase.execute(2026, now)).resolves.toMatchObject({
      totalTransactions: 5,
      recettesPayees: 10000,
      recettesTotal: 11200,
    });
  });
});
