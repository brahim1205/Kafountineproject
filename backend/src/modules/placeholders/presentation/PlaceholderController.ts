import type { Request, Response } from 'express';
import multer from 'multer';
import { env } from '../../../shared/config/env';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import { message, ok, okWithMeta } from '../../../shared/http/response';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ValidationError } from '../../../shared/errors/AppError';
import { PlaceholderSupportService } from './PlaceholderSupportService';
import { PlaceholderSettingsService } from './PlaceholderSettingsService';
import { PlaceholderNotificationsService } from './PlaceholderNotificationsService';
import { PlaceholderBudgetService } from './PlaceholderBudgetService';
import { PlaceholderQuaiService, type QuaiCollection } from './PlaceholderQuaiService';
import { PlaceholderFormationsService } from './PlaceholderFormationsService';
import { PlaceholderEtatCivilUrbanismeService } from './PlaceholderEtatCivilUrbanismeService';
import { PlaceholderMarketMotosService } from './PlaceholderMarketMotosService';
import { PlaceholderAuditService } from './PlaceholderAuditService';
import { PlaceholderUsersService } from './PlaceholderUsersService';
import { PlaceholderDocumentsService } from './PlaceholderDocumentsService';

type CollectionName =
  | 'etatCivil'
  | 'urbanisme'
  | 'notifications'
  | 'pecheurs'
  | 'embarcations'
  | 'commissions'
  | 'camions'
  | 'expeditions'
  | 'settingsTarifs'
  | 'settingsPenalites'
  | 'settingsPermissions'
  | 'backups';

export class PlaceholderController {
  private readonly supportService = new PlaceholderSupportService();
  private readonly settingsService = new PlaceholderSettingsService(this.supportService);
  private readonly notificationsService = new PlaceholderNotificationsService(this.supportService);
  private readonly budgetService = new PlaceholderBudgetService(this.supportService);
  private readonly quaiService = new PlaceholderQuaiService(this.supportService);
  private readonly formationsService = new PlaceholderFormationsService(this.supportService);
  private readonly etatCivilUrbanismeService = new PlaceholderEtatCivilUrbanismeService(this.supportService);
  private readonly marketMotosService = new PlaceholderMarketMotosService(this.supportService);
  private readonly auditService = new PlaceholderAuditService(this.supportService);
  private readonly usersService = new PlaceholderUsersService(this.supportService);
  private readonly documentsService = new PlaceholderDocumentsService(this.supportService);

  readonly upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxUploadFileSizeBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowedMimeTypes.has(file.mimetype)) {
        callback(new ValidationError('Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP.'));
        return;
      }
      callback(null, true);
    },
  });

  async listCollection(collection: CollectionName, req: Request, res: Response) {
    if (collection === 'pecheurs') {
      return ok(res, await this.quaiService.listCollection('pecheurs', req.query.year ? Number(req.query.year) : new Date().getFullYear()));
    }
    if (collection === 'embarcations') {
      return ok(res, await this.quaiService.listCollection('embarcations', req.query.year ? Number(req.query.year) : new Date().getFullYear()));
    }
    if (collection === 'commissions') {
      return ok(res, await this.quaiService.listCollection('commissions', req.query.year ? Number(req.query.year) : new Date().getFullYear()));
    }
    if (collection === 'camions') {
      return ok(res, await this.quaiService.listCollection('camions', req.query.year ? Number(req.query.year) : new Date().getFullYear()));
    }
    if (collection === 'expeditions') {
      return ok(res, await this.quaiService.listCollection('expeditions', req.query.year ? Number(req.query.year) : new Date().getFullYear()));
    }
    if (collection === 'notifications') {
      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      return ok(res, await this.notificationsService.listNotifications(year, limit));
    }
    throw new ValidationError(`Collection non supportée: ${collection}`);
  }

  async getCollectionItem(collection: CollectionName, req: Request, res: Response) {
    if (collection === 'pecheurs') {
      return ok(res, await this.quaiService.getCollectionItem('pecheurs', String(req.params.id)));
    }
    if (collection === 'embarcations') {
      return ok(res, await this.quaiService.getCollectionItem('embarcations', String(req.params.id)));
    }
    if (collection === 'commissions') {
      return ok(res, await this.quaiService.getCollectionItem('commissions', String(req.params.id)));
    }
    if (collection === 'camions') {
      return ok(res, await this.quaiService.getCollectionItem('camions', String(req.params.id)));
    }
    if (collection === 'expeditions') {
      return ok(res, await this.quaiService.getCollectionItem('expeditions', String(req.params.id)));
    }
    throw new ValidationError(`Collection non supportée: ${collection}`);
  }

  async createCollectionItem(collection: CollectionName) {
    throw new ValidationError(`Création non supportée pour la collection: ${collection}`);
  }

  async updateCollectionItem(collection: CollectionName, req: Request, res: Response) {
    if (['pecheurs', 'embarcations', 'commissions', 'camions', 'expeditions'].includes(collection)) {
      return ok(res, await this.quaiService.updateResource(collection as QuaiCollection, req as AuthRequest));
    }
    throw new ValidationError(`Mise à jour non supportée pour la collection: ${collection}`);
  }

  async deleteCollectionItem(collection: CollectionName, req: Request, res: Response) {
    if (['pecheurs', 'embarcations', 'commissions', 'camions', 'expeditions'].includes(collection)) {
      await this.quaiService.deleteResource(collection as QuaiCollection, req as AuthRequest);
      return message(res, 'Suppression effectuée');
    }
    throw new ValidationError(`Suppression non supportée pour la collection: ${collection}`);
  }

  async listUsers(req: Request, res: Response) {
    return ok(res, await this.usersService.listUsers(String(req.query.search || '')));
  }

  async createUser(req: Request, res: Response) {
    return ok(res, await this.usersService.createUser(req as AuthRequest), 201);
  }

  async updateUser(req: Request, res: Response) {
    return ok(res, await this.usersService.updateUser(req as AuthRequest, String(req.params.id)));
  }

  async deleteUser(req: Request, res: Response) {
    const result = await this.usersService.deleteUser(req as AuthRequest, String(req.params.id));
    return message(res, result.message);
  }

  async listFormations(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.formationsService.listFormations(year));
  }

  async createFormation(req: Request, res: Response) {
    return ok(res, await this.formationsService.createFormation(req as AuthRequest), 201);
  }

  async updateFormation(req: Request, res: Response) {
    return ok(res, await this.formationsService.updateFormation(req as AuthRequest));
  }

  async deleteFormation(req: Request, res: Response) {
    await this.formationsService.deleteFormation(req as AuthRequest);
    return message(res, 'Suppression effectuée');
  }

  async getFormationStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.formationsService.getFormationStats(year));
  }

  async listJeunes(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return ok(res, await this.formationsService.listJeunes(year, search, limit));
  }

  async createJeune(req: Request, res: Response) {
    return ok(res, await this.formationsService.createJeune(req as AuthRequest), 201);
  }

  async deleteJeune(req: Request, res: Response) {
    await this.formationsService.deleteJeune(req as AuthRequest);
    return message(res, 'Suppression effectuée');
  }

  async inscrireJeuneFormation(req: Request, res: Response) {
    await this.formationsService.inscrireJeuneFormation(req as AuthRequest);
    return ok(res, { success: true }, 201);
  }

  async listEtatCivil(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.etatCivilUrbanismeService.listEtatCivil(year));
  }

  async createEtatCivil(req: Request, res: Response) {
    const created = await this.etatCivilUrbanismeService.createEtatCivil(req as AuthRequest);
    return ok(
      res,
      {
        ...created,
        agent: await this.resolveActorDisplayName(req as AuthRequest),
      },
      201
    );
  }

  async updateEtatCivil(req: Request, res: Response) {
    return ok(res, await this.etatCivilUrbanismeService.updateEtatCivil(req as AuthRequest));
  }

  async deleteEtatCivil(req: Request, res: Response) {
    await this.etatCivilUrbanismeService.deleteEtatCivil(req as AuthRequest);
    return message(res, 'Suppression effectuée');
  }

  async etatCivilStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.etatCivilUrbanismeService.etatCivilStats(year));
  }

  async urbanismeList(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const statutFilter = req.query.statut ? String(req.query.statut).trim().toUpperCase() : '';
    const typeFilter = req.query.type ? String(req.query.type).trim() : '';
    const { data, total } = await this.etatCivilUrbanismeService.urbanismeList(page, limit, year, statutFilter, typeFilter);
    return okWithMeta(res, data, { page, limit, total });
  }

  async urbanismeShow(req: Request, res: Response) {
    return ok(res, await this.etatCivilUrbanismeService.urbanismeShow(String(req.params.id)));
  }

  async createUrbanisme(req: Request, res: Response) {
    const created = await this.etatCivilUrbanismeService.createUrbanisme(req as AuthRequest);
    return ok(
      res,
      {
        ...created,
        agent: await this.resolveActorDisplayName(req as AuthRequest),
      },
      201
    );
  }

  async updateUrbanisme(req: Request, res: Response) {
    return ok(res, await this.etatCivilUrbanismeService.updateUrbanisme(req as AuthRequest));
  }

  async deleteUrbanisme(req: Request, res: Response) {
    await this.etatCivilUrbanismeService.deleteUrbanisme(req as AuthRequest);
    return message(res, 'Suppression effectuée');
  }

  async urbanismeStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.etatCivilUrbanismeService.urbanismeStats(year));
  }

  async listPlacesMarche(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.marketMotosService.listPlacesMarche(year));
  }

  async createPlaceMarche(req: Request, res: Response) {
    return ok(res, await this.marketMotosService.createPlaceMarche(req as AuthRequest), 201);
  }

  async updatePlaceMarche(req: Request, res: Response) {
    return ok(res, await this.marketMotosService.updatePlaceMarche(req as AuthRequest));
  }

  async listPaiementsMarche(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.marketMotosService.listPaiementsMarche(year));
  }

  async createPaiementMarche(req: Request, res: Response) {
    return ok(res, await this.marketMotosService.createPaiementMarche(req as AuthRequest), 201);
  }

  async marcheStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.marketMotosService.marcheStats(year));
  }

  async listMotos(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return ok(res, await this.marketMotosService.listMotos(year, search, limit));
  }

  async createMoto(req: Request, res: Response) {
    return ok(res, await this.marketMotosService.createMoto(req as AuthRequest), 201);
  }

  async updateMoto(req: Request, res: Response) {
    return ok(res, await this.marketMotosService.updateMoto(req as AuthRequest));
  }

  async changeMotoDriver(req: Request, res: Response) {
    req.body = { ...(req.body || {}), conducteurId: req.body?.conducteurId, permis: req.body?.permis };
    return this.updateMoto(req, res);
  }

  async motosStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.marketMotosService.motosStats(year));
  }

  async motosConfiguration(_req: Request, res: Response) {
    return ok(res, { tarifMensuel: 1000, penaliteRetard: 250 });
  }

  async listMotoPayments(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.marketMotosService.listMotoPayments(year));
  }

  async createMotoPayment(req: Request, res: Response) {
    const actorName = await this.resolveActorDisplayName(req as AuthRequest);
    return ok(res, await this.marketMotosService.createMotoPayment(req as AuthRequest, actorName), 201);
  }

  async auditList(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const search = String(req.query.search || '').trim();
    const moduleFilter = String(req.query.module || '').trim();
    const statusFilter = String(req.query.statut || '').trim().toLowerCase();
    return ok(
      res,
      await this.auditService.listAudit({ page, limit, year, search, moduleFilter, statusFilter })
    );
  }

  async auditSeed(req: Request, res: Response) {
    await this.auditService.seedAudit(req as AuthRequest);
    return message(res, 'Log de démonstration généré');
  }

  async auditExport(req: Request, res: Response) {
    const year = req.body?.year ? Number(req.body.year) : new Date().getFullYear();
    const exported = await this.auditService.exportAuditCsv(year);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  }

  async quaiPecheStats(_req: Request, res: Response) {
    const year = _req.query.year ? Number(_req.query.year) : new Date().getFullYear();
    return ok(res, await this.quaiService.getStats(year));
  }

  async createQuaiResource(
    collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions',
    req: Request,
    res: Response
  ) {
    return ok(res, await this.quaiService.createResource(collection as QuaiCollection, req as AuthRequest), 201);
  }

  async markRead(req: Request, res: Response) {
    await this.notificationsService.markRead(String(req.params.id));
    return message(res, 'Mise à jour effectuée');
  }

  async markAllRead(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    await this.notificationsService.markAllRead(year);
    return message(res, 'Mise à jour effectuée');
  }

  async getTarifs(_req: Request, res: Response) {
    return ok(res, await this.settingsService.getTarifs());
  }

  async createTarif(req: Request, res: Response) {
    return ok(res, await this.settingsService.createTarif(req as AuthRequest), 201);
  }

  async updateTarif(req: Request, res: Response) {
    return ok(res, await this.settingsService.updateTarif(req as AuthRequest));
  }

  async deleteTarif(req: Request, res: Response) {
    await this.settingsService.deleteTarif(req as AuthRequest);
    return message(res, 'Tarif supprimé');
  }

  async getPenalites(_req: Request, res: Response) {
    return ok(res, await this.settingsService.getPenalites());
  }

  async createPenalite(req: Request, res: Response) {
    return ok(res, await this.settingsService.createPenalite(req as AuthRequest), 201);
  }

  async updatePenalite(req: Request, res: Response) {
    return ok(res, await this.settingsService.updatePenalite(req as AuthRequest));
  }

  async deletePenalite(req: Request, res: Response) {
    await this.settingsService.deletePenalite(req as AuthRequest);
    return message(res, 'Pénalité supprimée');
  }

  async getPermissions(_req: Request, res: Response) {
    return ok(res, await this.settingsService.getPermissions());
  }

  async updatePermission(req: Request, res: Response) {
    await this.settingsService.updatePermission(req as AuthRequest);
    return message(res, 'Permission mise à jour');
  }

  async listBackups(_req: Request, res: Response) {
    return ok(res, await this.settingsService.listBackups());
  }

  async createBackup(req: Request, res: Response) {
    return ok(res, await this.settingsService.createBackup(req as AuthRequest), 201);
  }

  async restoreBackup(req: Request, res: Response) {
    await this.settingsService.restoreBackup(req as AuthRequest);
    return message(res, 'Restauration terminée');
  }

  async downloadBackup(req: Request, res: Response) {
    const filename = String(req.params.filename || '').trim();
    const backup = await this.settingsService.downloadBackup(filename);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    res.send(backup.snapshot);
  }

  async years(_req: Request, res: Response) {
    return ok(res, await this.notificationsService.listYears());
  }

  async currentYear(_req: Request, res: Response) {
    return ok(res, this.notificationsService.getCurrentYear());
  }

  async autoCreateYear(req: Request, res: Response) {
    return ok(res, await this.notificationsService.autoCreateYear(req as AuthRequest), 201);
  }

  async uploadImage(req: Request, res: Response) {
    return ok(res, await this.documentsService.uploadImage(req.file), 201);
  }

  async deleteImage(req: Request, res: Response) {
    await this.documentsService.deleteImage(String(req.params.publicId || ''));
    return message(res, 'Image supprimée');
  }

  async exportReceiptPdf(req: Request, res: Response) {
    const { filename, pdf } = await this.documentsService.exportReceiptPdf(req as AuthRequest);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(pdf);
  }

  async exportReportPdf(req: Request, res: Response) {
    const { filename, pdf } = await this.documentsService.exportReportPdf(req as AuthRequest);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(pdf);
  }

  async getReportData(req: Request, res: Response) {
    return ok(res, await this.documentsService.getReportData(req as AuthRequest));
  }

  async listBudgetLignes(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.budgetService.listBudgetLignes(year));
  }

  async createBudgetLigne(req: Request, res: Response) {
    return ok(res, await this.budgetService.createBudgetLigne(req as AuthRequest), 201);
  }

  async updateBudgetLigne(req: Request, res: Response) {
    return ok(res, await this.budgetService.updateBudgetLigne(req as AuthRequest));
  }

  async deleteBudgetLigne(req: Request, res: Response) {
    await this.budgetService.deleteBudgetLigne(req as AuthRequest);
    return message(res, 'Ligne budgétaire supprimée');
  }

  async getBudgetStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.budgetService.getBudgetStats(year));
  }

  async listBudgetDemandes(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.budgetService.listBudgetDemandes(year));
  }

  async createBudgetDemande(req: Request, res: Response) {
    return ok(res, await this.budgetService.createBudgetDemande(req as AuthRequest), 201);
  }

  async updateBudgetDemande(req: Request, res: Response) {
    return ok(res, await this.budgetService.updateBudgetDemande(req as AuthRequest));
  }

  private async resolveActorDisplayName(req: AuthRequest) {
    const actorId = req.user?.userId;
    if (!actorId) {
      return 'Agent municipal';
    }
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    return actor ? `${actor.prenom} ${actor.nom}`.trim() : 'Agent municipal';
  }
}
