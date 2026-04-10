import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildSimplePdf } from '../../../shared/pdf/simplePdf';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';

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
    ]);

    await this.supportService.writeAuditLog(req, {
      action: 'Export PDF rapport',
      module: 'rapports',
      details: `Export du rapport annuel ${year}`,
    });

    return {
      filename: `rapport-annuel-${year}.pdf`,
      pdf,
    };
  }
}
