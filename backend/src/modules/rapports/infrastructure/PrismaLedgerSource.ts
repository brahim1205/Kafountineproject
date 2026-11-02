import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { LedgerEntry, LedgerSource } from '../domain/Ledger';

const fullName = (person?: { prenom: string; nom: string } | null) => `${person?.prenom || ''} ${person?.nom || ''}`.trim();

export class PrismaLedgerSource implements LedgerSource {
  async entriesForYear(year: number) {
    const [transactions, etatCivil, urbanisme, market, motos, budgets, formations, jeunes] = await Promise.all([
      prisma.transaction.findMany({ where: { year }, include: { contribuable: true }, orderBy: { createdAt: 'asc' } }),
      prisma.etatCivilRequest.findMany({ where: { year }, include: { contribuable: true }, orderBy: { createdAt: 'asc' } }),
      prisma.urbanismeCase.findMany({ where: { year }, include: { contribuable: true }, orderBy: { createdAt: 'asc' } }),
      prisma.marketPayment.findMany({
        where: { year },
        include: { place: { include: { occupant: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.motoPayment.findMany({
        where: { year },
        include: { moto: { include: { proprietaire: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.budgetRequest.findMany({ where: { year }, orderBy: { createdAt: 'asc' } }),
      prisma.trainingProgram.findMany({ where: { year }, orderBy: { createdAt: 'asc' } }),
      prisma.youthProfile.findMany({ where: { year }, orderBy: { createdAt: 'asc' } }),
    ]);

    const entries: LedgerEntry[] = [];

    for (const t of transactions) {
      entries.push({
        id: t.id,
        date: t.date || t.createdAt,
        person: fullName(t.contribuable) || 'Inconnu',
        type: `Recette (${t.categorie})`,
        amount: Number(t.montant),
        description: t.service || 'Paiement taxe',
        module: 'recettes',
      });
    }

    for (const e of etatCivil) {
      entries.push({
        id: e.id,
        date: e.createdAt,
        person: fullName(e.contribuable) || 'Inconnu',
        type: 'Etat Civil',
        amount: Number(e.montant),
        description: e.typeDocument || 'Document civil',
        module: 'etat-civil',
      });
    }

    for (const u of urbanisme) {
      entries.push({
        id: u.id,
        date: u.createdAt,
        person: fullName(u.contribuable) || 'Inconnu',
        type: 'Urbanisme',
        amount: Number(u.montant),
        description: u.type || 'Permis',
        module: 'urbanisme',
      });
    }

    for (const m of market) {
      const occupant = m.place?.occupant;
      entries.push({
        id: m.id,
        date: m.datePaiement || m.createdAt,
        person: occupant ? fullName(occupant) : 'Occupant inconnu',
        type: 'Marché',
        amount: Number(m.montant),
        description: `Place ${m.place?.numeroPlace || '-'}`,
        module: 'marche',
      });
    }

    for (const m of motos) {
      const proprietaire = m.moto?.proprietaire;
      entries.push({
        id: m.id,
        date: m.datePaiement || m.createdAt,
        person: proprietaire ? fullName(proprietaire) : 'Propriétaire inconnu',
        type: 'Motos',
        amount: Number(m.montant),
        description: `Imm. ${m.moto?.matricule || '-'}`,
        module: 'motos',
      });
    }

    for (const b of budgets) {
      entries.push({
        id: b.id,
        date: b.createdAt,
        person: b.service || 'Mairie',
        type: 'Dépense',
        amount: -Number(b.montant),
        description: b.motif || b.description || 'Dépense budget',
        module: 'budget',
      });
    }

    for (const f of formations) {
      entries.push({
        id: f.id,
        date: f.createdAt,
        person: f.responsable || 'Mairie',
        type: 'Formation',
        amount: -Number(f.budget),
        description: f.domaine || 'Prog. Formation',
        module: 'formations',
      });
    }

    for (const j of jeunes) {
      entries.push({
        id: j.id,
        date: j.createdAt,
        person: fullName(j),
        type: 'Activité (Jeunesse)',
        amount: 0,
        description: 'Inscription jeune',
        module: 'jeunesse',
      });
    }

    return entries;
  }
}
