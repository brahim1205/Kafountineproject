import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildSimplePdf } from '../../../shared/pdf/simplePdf';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';

export class PlaceholderDocumentsService {
  constructor(private readonly supportService: PlaceholderSupportService) {}

  async uploadImage(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new ValidationError('Aucun fichier image fourni.');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new ValidationError('Type de fichier non autorisé.');
    }

    const extension = file.originalname.split('.').pop() || 'jpg';
    const publicId = `upload-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const filename = `${publicId}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(filepath, file.buffer);

    return {
      publicId,
      url: `/uploads/${filename}`,
      format: extension,
      width: 0,
      height: 0,
    };
  }

  async deleteImage(publicId: string) {
    const normalizedPublicId = publicId.trim();
    if (!normalizedPublicId) {
      throw new ValidationError('Identifiant image invalide.');
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const entries = await fs.readdir(uploadsDir).catch(() => []);
    const match = entries.find((entry) => entry.startsWith(`${normalizedPublicId}.`));
    if (!match) {
      throw new NotFoundError('Image introuvable.');
    }

    await fs.unlink(path.join(uploadsDir, match));
  }

  async exportReceiptPdf(req: AuthRequest) {
    const payload = req.body as Record<string, unknown>;
    const ticketNumber = String(payload.ticketNumber || '').trim();
    const contributor = String(payload.contributor || '').trim();
    const type = String(payload.type || '').trim();
    const amount = Number(payload.amount || 0);

    if (!ticketNumber || !contributor || !type || !Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Les informations du reçu sont incomplètes.');
    }

    const pdf = buildSimplePdf(`Recu ${ticketNumber}`, [
      {
        lines: [
          'Commune de Kafountine',
          'Region de Ziguinchor - Departement de Bignona',
          '',
          `Numero de recu: ${ticketNumber}`,
          `Date: ${String(payload.date || '').trim() || '-'}`,
          `Heure: ${String(payload.time || '').trim() || '-'}`,
          `Contribuable: ${contributor}`,
          `Type de paiement: ${type}`,
          `Montant: ${amount.toLocaleString('fr-FR')} FCFA`,
          `Agent collecteur: ${String(payload.agent || '').trim() || '-'}`,
          `Telephone: ${String(payload.telephone || '').trim() || '-'}`,
          `NIN: ${String(payload.nin || '').trim() || '-'}`,
          `Adresse: ${String(payload.adresse || '').trim() || '-'}`,
          `Reference: ${String(payload.reference || '').trim() || '-'}`,
          `Categorie: ${String(payload.categorie || '').trim() || '-'}`,
          `Service: ${String(payload.service || '').trim() || '-'}`,
          `Quantite: ${String(payload.quantite || '').trim() || '-'}`,
          `Unite: ${String(payload.unite || '').trim() || '-'}`,
          `Tarif unitaire: ${String(payload.tarifUnitaire || '').trim() || '-'}`,
          `Mode de paiement: ${String(payload.modePaiement || '').trim() || '-'}`,
          `Statut: ${String(payload.statut || '').trim() || '-'}`,
          `Localisation: ${String(payload.localisation || '').trim() || '-'}`,
          `Nature: ${String(payload.nature || '').trim() || '-'}`,
          `Description: ${String(payload.description || '').trim() || '-'}`,
          `Verification: https://kafountine.sn/verify?recu=${encodeURIComponent(ticketNumber)}`,
        ],
      },
    ]);

    await this.supportService.writeAuditLog(req, {
      action: 'Export PDF reçu',
      module: 'recettes',
      details: `Export du reçu ${ticketNumber}`,
    });

    return {
      filename: `recu-${ticketNumber}.pdf`,
      pdf,
    };
  }

  async exportReportPdf(req: AuthRequest) {
    const payload = req.body as Record<string, unknown>;
    const year = Number(payload.year);
    const total = Number(payload.total || 0);
    const tauxRecouvrement = Number(payload.tauxRecouvrement || 0);
    const totalTransactions = Number(payload.totalTransactions || 0);
    const totalContribuables = Number(payload.totalContribuables || 0);
    const modules = Array.isArray(payload.modules) ? (payload.modules as Array<Record<string, unknown>>) : [];
    const topContribuables = Array.isArray(payload.topContribuables)
      ? (payload.topContribuables as Array<Record<string, unknown>>)
      : [];

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new ValidationError('Année de rapport invalide.');
    }

    const [transactions, etatCivil, urbanisme, market, motos, budgets, formations, jeunes] = await Promise.all([
      prisma.transaction.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.etatCivilRequest.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.urbanismeCase.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
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
      prisma.budgetRequest.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.trainingProgram.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.youthProfile.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    type LedgerItem = {
      date: Date;
      person: string;
      type: string;
      amount: number;
      description: string;
    };

    const ledger: LedgerItem[] = [];

    for (const t of transactions) {
      ledger.push({
        date: t.date || t.createdAt,
        person: `${t.contribuable?.prenom || ''} ${t.contribuable?.nom || ''}`.trim(),
        type: `Recette (${t.categorie})`,
        amount: t.montant,
        description: t.service || 'Paiement taxe',
      });
    }

    for (const e of etatCivil) {
      ledger.push({
        date: e.createdAt,
        person: `${e.contribuable?.prenom || ''} ${e.contribuable?.nom || ''}`.trim(),
        type: `Etat Civil`,
        amount: e.montant,
        description: e.typeDocument || 'Document civil',
      });
    }

    for (const u of urbanisme) {
      ledger.push({
        date: u.createdAt,
        person: `${u.contribuable?.prenom || ''} ${u.contribuable?.nom || ''}`.trim(),
        type: `Urbanisme`,
        amount: u.montant,
        description: u.type || 'Permis',
      });
    }

    for (const m of market) {
      const occupant = m.place?.occupant;
      ledger.push({
        date: m.datePaiement || m.createdAt,
        person: occupant ? `${occupant.prenom} ${occupant.nom}`.trim() : 'Inconnu',
        type: `Marché`,
        amount: m.montant,
        description: `Place ${m.place?.numeroPlace || '-'}`,
      });
    }

    for (const m of motos) {
      const prop = m.moto?.proprietaire;
      ledger.push({
        date: m.datePaiement || m.createdAt,
        person: prop ? `${prop.prenom} ${prop.nom}`.trim() : 'Inconnu',
        type: `Motos`,
        amount: m.montant,
        description: `Imm. ${m.moto?.matricule || '-'}`,
      });
    }

    for (const b of budgets) {
      ledger.push({
        date: b.createdAt,
        person: b.service || 'Mairie',
        type: `Dépense`,
        amount: -(b.montant),
        description: b.motif || b.description || 'Dépense budget',
      });
    }

    for (const f of formations) {
      ledger.push({
        date: f.createdAt,
        person: f.responsable || 'Mairie',
        type: `Formation`,
        amount: -(f.budget),
        description: f.domaine || 'Prog. Formation',
      });
    }

    for (const j of jeunes) {
      ledger.push({
        date: j.createdAt,
        person: `${j.prenom} ${j.nom}`.trim(),
        type: `Activité (Jeunesse)`,
        amount: 0,
        description: `Inscription jeune`,
      });
    }

    ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

    const groupedByMonth = new Map<string, LedgerItem[]>();
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const item of ledger) {
      const monthKey = formatter.format(item.date).replace(/^\\w/, (c) => c.toUpperCase());
      if (!groupedByMonth.has(monthKey)) groupedByMonth.set(monthKey, []);
      groupedByMonth.get(monthKey)!.push(item);
    }

    const pdfSections: any[] = [
      {
        title: 'Synthese',
        lines: [
          `Total annuel: ${total.toLocaleString('fr-FR')} FCFA`,
          `Taux de recouvrement: ${tauxRecouvrement}%`,
          `Transactions: ${totalTransactions.toLocaleString('fr-FR')}`,
          `Contribuables: ${totalContribuables.toLocaleString('fr-FR')}`,
        ],
      },
      {
        title: 'Repartition par module',
        lines:
          modules.length > 0
            ? modules.map((item) => {
                const name = String(item.name || 'Module');
                const amount = Number(item.amount || 0);
                const evolution = Number(item.evolution || 0);
                return `${name}: ${amount.toLocaleString('fr-FR')} FCFA | Evolution: ${evolution}%`;
              })
            : ['Aucune donnée module disponible.'],
      },
      {
        title: 'Top contribuables',
        lines:
          topContribuables.length > 0
            ? topContribuables.map(
                (item, index) =>
                  `#${index + 1} ${String(item.name || '-')}: ${Number(item.amount || 0).toLocaleString(
                    'fr-FR'
                  )} FCFA`
              )
            : ['Aucun contribuable à afficher.'],
      },
    ];

    if (ledger.length > 0) {
      pdfSections.push({ title: '--- JOURNAL DETAILLE DES OPERATIONS ---', lines: [] });

      const header = 'DATE       | OPERATION            | ACTEUR          | MONTANT       | DESCRIPTION';
      const sep    = '------------------------------------------------------------------------------------------';

      for (const [month, items] of groupedByMonth.entries()) {
        const linesForMonth = [header, sep];
        for (const item of items) {
          const dateStr = timeFormatter.format(item.date).split(' ')[0];
          
          let cleanType = (item.type || '').normalize('NFD').replace(/[^\x20-\x7E]/g, '');
          const typeStr = cleanType.substring(0, 20).padEnd(20, ' ');
          
          let cleanPerson = (item.person || '').normalize('NFD').replace(/[^\x20-\x7E]/g, '');
          const personStr = cleanPerson.substring(0, 15).padEnd(15, ' ');
          
          let amountStr = '';
          if (item.amount === 0) amountStr = '-';
          else amountStr = `${item.amount > 0 ? '+' : ''}${item.amount.toLocaleString('fr-FR')}`;
          amountStr = amountStr.substring(0, 13).padEnd(13, ' ');
          
          let cleanDesc = (item.description || '').normalize('NFD').replace(/[^\x20-\x7E]/g, '');
          const descStr = cleanDesc.substring(0, 20).padEnd(20, ' ');
          
          linesForMonth.push(`${dateStr} | ${typeStr} | ${personStr} | ${amountStr} | ${descStr}`);
        }
        pdfSections.push({
          title: month,
          lines: linesForMonth,
        });
      }
    } else {
      pdfSections.push({
        title: '--- JOURNAL DETAILLE DES OPERATIONS ---',
        lines: ['Aucune operation enregistree pour cette annee.'],
      });
    }

    const pdf = buildSimplePdf(`Rapport annuel ${year}`, pdfSections);

    await this.supportService.writeAuditLog(req, {
      action: 'Export PDF rapport',
      module: 'rapports',
      details: `Export du rapport annuel ${year} avec journal detaille`,
    });

    return {
      filename: `rapport-annuel-${year}.pdf`,
      pdf,
    };
  }

  async getReportData(req: AuthRequest) {
    const year = Number(req.query.year) || new Date().getFullYear();

    const [transactions, etatCivil, urbanisme, market, motos, budgets, formations, jeunes] = await Promise.all([
      prisma.transaction.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.etatCivilRequest.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.urbanismeCase.findMany({
        where: { year },
        include: { contribuable: true },
        orderBy: { createdAt: 'asc' },
      }),
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
      prisma.budgetRequest.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.trainingProgram.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.youthProfile.findMany({
        where: { year },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const ledger: any[] = [];

    for (const t of transactions) {
      ledger.push({
        id: t.id,
        date: t.date || t.createdAt,
        person: `${t.contribuable?.prenom || ''} ${t.contribuable?.nom || ''}`.trim() || 'Inconnu',
        type: `Recette (${t.categorie})`,
        amount: t.montant,
        description: t.service || 'Paiement taxe',
        module: 'recettes'
      });
    }

    for (const e of etatCivil) {
      ledger.push({
        id: e.id,
        date: e.createdAt,
        person: `${e.contribuable?.prenom || ''} ${e.contribuable?.nom || ''}`.trim() || 'Inconnu',
        type: `Etat Civil`,
        amount: e.montant,
        description: e.typeDocument || 'Document civil',
        module: 'etat-civil'
      });
    }

    for (const u of urbanisme) {
      ledger.push({
        id: u.id,
        date: u.createdAt,
        person: `${u.contribuable?.prenom || ''} ${u.contribuable?.nom || ''}`.trim() || 'Inconnu',
        type: `Urbanisme`,
        amount: u.montant,
        description: u.type || 'Permis',
        module: 'urbanisme'
      });
    }

    for (const m of market) {
      const occupant = m.place?.occupant;
      ledger.push({
        id: m.id,
        date: m.datePaiement || m.createdAt,
        person: occupant ? `${occupant.prenom} ${occupant.nom}`.trim() : 'Occupant inconnu',
        type: `Marché`,
        amount: m.montant,
        description: `Place ${m.place?.numeroPlace || '-'}`,
        module: 'marche'
      });
    }

    for (const m of motos) {
      const prop = m.moto?.proprietaire;
      ledger.push({
        id: m.id,
        date: m.datePaiement || m.createdAt,
        person: prop ? `${prop.prenom} ${prop.nom}`.trim() : 'Propriétaire inconnu',
        type: `Motos`,
        amount: m.montant,
        description: `Imm. ${m.moto?.matricule || '-'}`,
        module: 'motos'
      });
    }

    for (const b of budgets) {
      ledger.push({
        id: b.id,
        date: b.createdAt,
        person: b.service || 'Mairie',
        type: `Dépense`,
        amount: -(b.montant),
        description: b.motif || b.description || 'Dépense budget',
        module: 'budget'
      });
    }

    for (const f of formations) {
      ledger.push({
        id: f.id,
        date: f.createdAt,
        person: f.responsable || 'Mairie',
        type: `Formation`,
        amount: -(f.budget),
        description: f.domaine || 'Prog. Formation',
        module: 'formations'
      });
    }

    for (const j of jeunes) {
      ledger.push({
        id: j.id,
        date: j.createdAt,
        person: `${j.prenom} ${j.nom}`.trim(),
        type: `Activité (Jeunesse)`,
        amount: 0,
        description: `Inscription jeune`,
        module: 'jeunesse'
      });
    }

    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return ledger;
  }
}
