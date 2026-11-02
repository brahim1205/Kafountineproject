import { ValidationError } from '../../../shared/errors/AppError';
import { buildSimplePdf } from '../../../shared/pdf/simplePdf';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { LedgerEntry, LedgerSource } from '../domain/Ledger';

type PdfSection = {
  title?: string;
  lines: string[];
};

export type ReceiptInput = Record<string, unknown> & {
  ticketNumber?: string;
  contributor?: string;
  type?: string;
  amount?: number;
};

export type ReportInput = {
  year?: number;
  total?: number;
  tauxRecouvrement?: number;
  totalTransactions?: number;
  totalContribuables?: number;
  modules?: Array<{ name?: string; amount?: number; evolution?: number }>;
  topContribuables?: Array<{ name?: string; amount?: number }>;
};

const RECEIPT_FIELDS: Array<[label: string, key: string]> = [
  ['Agent collecteur', 'agent'],
  ['Telephone', 'telephone'],
  ['NIN', 'nin'],
  ['Adresse', 'adresse'],
  ['Reference', 'reference'],
  ['Categorie', 'categorie'],
  ['Service', 'service'],
  ['Quantite', 'quantite'],
  ['Unite', 'unite'],
  ['Tarif unitaire', 'tarifUnitaire'],
  ['Mode de paiement', 'modePaiement'],
  ['Statut', 'statut'],
  ['Localisation', 'localisation'],
  ['Nature', 'nature'],
  ['Description', 'description'],
];

const display = (value: unknown) => String(value || '').trim() || '-';
const ascii = (value: string) => value.normalize('NFD').replace(/[^\x20-\x7E]/g, '');

function ledgerTable(entries: LedgerEntry[]): PdfSection[] {
  if (entries.length === 0) {
    return [{ title: '--- JOURNAL DETAILLE DES OPERATIONS ---', lines: ['Aucune operation enregistree pour cette annee.'] }];
  }

  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const byMonth = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const month = monthFormatter.format(entry.date).replace(/^\p{L}/u, (c) => c.toUpperCase());
    byMonth.set(month, [...(byMonth.get(month) || []), entry]);
  }

  const header = 'DATE       | OPERATION            | ACTEUR          | MONTANT       | DESCRIPTION';
  const separator = '------------------------------------------------------------------------------------------';
  const sections: PdfSection[] = [{ title: '--- JOURNAL DETAILLE DES OPERATIONS ---', lines: [] }];

  for (const [month, items] of byMonth.entries()) {
    const lines = [header, separator];
    for (const item of items) {
      const date = dateFormatter.format(item.date).split(' ')[0];
      const type = ascii(item.type || '').substring(0, 20).padEnd(20, ' ');
      const person = ascii(item.person || '').substring(0, 15).padEnd(15, ' ');
      const amount = (item.amount === 0 ? '-' : `${item.amount > 0 ? '+' : ''}${item.amount.toLocaleString('fr-FR')}`)
        .substring(0, 13)
        .padEnd(13, ' ');
      const description = ascii(item.description || '').substring(0, 20).padEnd(20, ' ');
      lines.push(`${date} | ${type} | ${person} | ${amount} | ${description}`);
    }
    sections.push({ title: month, lines });
  }

  return sections;
}

export class RapportService {
  constructor(
    private readonly ledger: LedgerSource,
    private readonly auditTrail: AuditTrail
  ) {}

  async exportReceiptPdf(actor: Actor, input: ReceiptInput) {
    const ticketNumber = String(input.ticketNumber || '').trim();
    const contributor = String(input.contributor || '').trim();
    const type = String(input.type || '').trim();
    const amount = Number(input.amount || 0);

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
          `Date: ${display(input.date)}`,
          `Heure: ${display(input.time)}`,
          `Contribuable: ${contributor}`,
          `Type de paiement: ${type}`,
          `Montant: ${amount.toLocaleString('fr-FR')} FCFA`,
          ...RECEIPT_FIELDS.map(([label, key]) => `${label}: ${display(input[key])}`),
          `Verification: https://kafountine.sn/verify?recu=${encodeURIComponent(ticketNumber)}`,
        ],
      },
    ]);

    await this.auditTrail.record(actor, {
      action: 'Export PDF reçu',
      module: 'recettes',
      details: `Export du reçu ${ticketNumber}`,
    });

    return { filename: `recu-${ticketNumber}.pdf`, pdf };
  }

  async exportReportPdf(actor: Actor, input: ReportInput) {
    const year = Number(input.year);
    const total = Number(input.total || 0);
    const tauxRecouvrement = Number(input.tauxRecouvrement || 0);
    const totalTransactions = Number(input.totalTransactions || 0);
    const totalContribuables = Number(input.totalContribuables || 0);
    const modules = Array.isArray(input.modules) ? input.modules : [];
    const topContribuables = Array.isArray(input.topContribuables) ? input.topContribuables : [];

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new ValidationError('Année de rapport invalide.');
    }

    const entries = (await this.ledger.entriesForYear(year)).sort((a, b) => a.date.getTime() - b.date.getTime());

    const pdf = buildSimplePdf(`Rapport annuel ${year}`, [
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
                (item, index) => `#${index + 1} ${String(item.name || '-')}: ${Number(item.amount || 0).toLocaleString('fr-FR')} FCFA`
              )
            : ['Aucun contribuable à afficher.'],
      },
      ...ledgerTable(entries),
    ]);

    await this.auditTrail.record(actor, {
      action: 'Export PDF rapport',
      module: 'rapports',
      details: `Export du rapport annuel ${year} avec journal detaille`,
    });

    return { filename: `rapport-annuel-${year}.pdf`, pdf };
  }

  async reportData(year: number) {
    const entries = await this.ledger.entriesForYear(year);
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
