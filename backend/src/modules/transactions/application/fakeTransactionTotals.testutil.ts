// Doublure des agrégats du dépôt des tickets, calculés sur une liste en mémoire (tests uniquement).
import type { DateRange, TransactionRepository } from '../domain/TransactionRepository';

export type FakeTicket = { montant: number; statut: string; categorie: string; date: Date };

export function fakeTotalsRepository(tickets: () => FakeTicket[]) {
  return {
    paidByCategory: jest.fn(async (_year: number, range?: DateRange) => {
      const byCategory = new Map<string, { montant: number; nombre: number }>();
      for (const ticket of tickets()) {
        if (ticket.statut !== 'PAYE') continue;
        if (range && (ticket.date < range.from || ticket.date >= range.to)) continue;
        const current = byCategory.get(ticket.categorie) || { montant: 0, nombre: 0 };
        byCategory.set(ticket.categorie, { montant: current.montant + ticket.montant, nombre: current.nombre + 1 });
      }
      return [...byCategory.entries()].map(([categorie, value]) => ({ categorie, ...value }));
    }),
    yearTotals: jest.fn(async () => ({
      nombre: tickets().length,
      montant: tickets().reduce((sum, ticket) => sum + ticket.montant, 0),
    })),
  } as unknown as TransactionRepository;
}
