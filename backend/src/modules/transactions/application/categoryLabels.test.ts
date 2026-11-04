import { buildCategoryLabeler } from './categoryLabels';
import { GetTransactionStatisticsUseCase } from './GetTransactionStatisticsUseCase';
import type { TaxCatalog } from '../domain/TaxCatalog';
import { fakeTotalsRepository } from './fakeTransactionTotals.testutil';

const catalog: TaxCatalog = {
  listCategories: () => [
    { id: 'etat-civil', nom: 'Etat civil' },
    { id: 'peche-artisanale', nom: 'Pêche artisanale' },
  ],
  listServices: () => [],
};

describe('buildCategoryLabeler', () => {
  it('ramène toutes les formes d’une même catégorie au même libellé', async () => {
    const label = await buildCategoryLabeler(catalog);

    for (const value of ['etat-civil', 'ETAT_CIVIL', 'Etat civil', 'État civil']) {
      expect(label(value)).toBe('État civil');
    }
    expect(label('MARCHE')).toBe('Marché');
    expect(label('urbanisme-habitat')).toBe('Urbanisme');
    expect(label('URBANISME')).toBe('Urbanisme');
  });

  it('reprend le libellé du catalogue, garde les libellés libres et met en forme les codes inconnus', async () => {
    const label = await buildCategoryLabeler(catalog);

    expect(label('peche-artisanale')).toBe('Pêche artisanale');
    expect(label('Ticket journalier')).toBe('Ticket journalier');
    expect(label('DROITS_PLACE')).toBe('Droits place');
    expect(label('')).toBe('Autres');
  });

  it('se passe du catalogue s’il est indisponible', async () => {
    const label = await buildCategoryLabeler({ listCategories: () => Promise.reject(new Error('down')), listServices: () => [] });

    expect(label('etat-civil')).toBe('État civil');
    expect(label('peche-artisanale')).toBe('peche-artisanale');
  });
});

describe('GetTransactionStatisticsUseCase avec le catalogue', () => {
  it('regroupe les formes d’une même catégorie sur une seule ligne', async () => {
    const date = new Date('2026-11-04T10:00:00');
    const repository = fakeTotalsRepository(() => [
      { montant: 1000, statut: 'PAYE', categorie: 'etat-civil', date },
      { montant: 500, statut: 'PAYE', categorie: 'ETAT_CIVIL', date },
    ]);

    const stats = await new GetTransactionStatisticsUseCase(repository, catalog).execute(2026, date);

    expect(stats.annee.categories).toEqual([{ nom: 'État civil', montant: 1500, pourcentage: 100 }]);
  });
});
