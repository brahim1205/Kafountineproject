import type { Request, Response } from 'express';
import multer from 'multer';
import { message, ok, okWithMeta } from '../../../shared/http/response';
import { JsonPlaceholderStore } from '../infrastructure/JsonPlaceholderStore';

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
  readonly upload = multer({ storage: multer.memoryStorage() });

  constructor(private readonly store: JsonPlaceholderStore) {}

  async listCollection(collection: CollectionName, req: Request, res: Response) {
    const data =
      collection === 'notifications'
        ? await this.store.listNotifications(req.query.limit ? Number(req.query.limit) : undefined)
        : await this.store.listCollection(collection, {
            year: req.query.year ? Number(req.query.year) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
          });
    return ok(res, data);
  }

  async getCollectionItem(collection: CollectionName, req: Request, res: Response) {
    return ok(res, await this.store.getCollectionItem(collection, String(req.params.id)));
  }

  async createCollectionItem(collection: CollectionName, req: Request, res: Response) {
    return ok(res, await this.store.createCollectionItem(collection, req.body || {}), 201);
  }

  async updateCollectionItem(collection: CollectionName, req: Request, res: Response) {
    return ok(res, await this.store.updateCollectionItem(collection, String(req.params.id), req.body || {}));
  }

  async deleteCollectionItem(collection: CollectionName, req: Request, res: Response) {
    await this.store.deleteCollectionItem(collection, String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async listUsers(req: Request, res: Response) {
    return ok(res, await this.store.listUsers(req.query.search ? String(req.query.search) : undefined));
  }

  async createUser(req: Request, res: Response) {
    return ok(res, await this.store.createUser(req.body || {}), 201);
  }

  async updateUser(req: Request, res: Response) {
    return ok(res, await this.store.updateUser(String(req.params.id), req.body || {}));
  }

  async deleteUser(req: Request, res: Response) {
    await this.store.deleteUser(String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async listFormations(req: Request, res: Response) {
    return ok(res, await this.store.listFormations(req.query.year ? Number(req.query.year) : undefined));
  }

  async createFormation(req: Request, res: Response) {
    return ok(res, await this.store.createFormation(req.body || {}), 201);
  }

  async updateFormation(req: Request, res: Response) {
    return ok(res, await this.store.updateFormation(String(req.params.id), req.body || {}));
  }

  async deleteFormation(req: Request, res: Response) {
    await this.store.deleteFormation(String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async getFormationStats(req: Request, res: Response) {
    return ok(res, await this.store.getFormationStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async listJeunes(req: Request, res: Response) {
    return ok(
      res,
      await this.store.listJeunes(
        req.query.year ? Number(req.query.year) : undefined,
        req.query.search ? String(req.query.search) : undefined,
        req.query.limit ? Number(req.query.limit) : undefined
      )
    );
  }

  async createJeune(req: Request, res: Response) {
    return ok(res, await this.store.createJeune(req.body || {}), 201);
  }

  async deleteJeune(req: Request, res: Response) {
    await this.store.deleteJeune(String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async inscrireJeuneFormation(req: Request, res: Response) {
    return ok(res, await this.store.inscrireJeuneFormation(String(req.params.id), String(req.params.formationId)), 201);
  }

  async listEtatCivil(req: Request, res: Response) {
    return ok(res, await this.store.listEtatCivil(req.query.year ? Number(req.query.year) : undefined));
  }

  async createEtatCivil(req: Request, res: Response) {
    return ok(res, await this.store.createEtatCivil(req.body || {}), 201);
  }

  async updateEtatCivil(req: Request, res: Response) {
    return ok(res, await this.store.updateCollectionItem('etatCivil', String(req.params.id), req.body || {}));
  }

  async etatCivilStats(req: Request, res: Response) {
    return ok(res, await this.store.getEtatCivilStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async urbanismeList(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    const all = await this.store.listUrbanisme(req.query.year ? Number(req.query.year) : undefined);
    const data = all.slice((page - 1) * limit, page * limit);
    return okWithMeta(res, data, { page, limit, total: all.length });
  }

  async urbanismeShow(req: Request, res: Response) {
    return ok(res, await this.store.getCollectionItem('urbanisme', String(req.params.id)));
  }

  async createUrbanisme(req: Request, res: Response) {
    return ok(res, await this.store.createUrbanisme(req.body || {}), 201);
  }

  async updateUrbanisme(req: Request, res: Response) {
    return ok(res, await this.store.updateCollectionItem('urbanisme', String(req.params.id), req.body || {}));
  }

  async deleteUrbanisme(req: Request, res: Response) {
    await this.store.deleteCollectionItem('urbanisme', String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async urbanismeStats(req: Request, res: Response) {
    return ok(res, await this.store.getUrbanismeStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async listPlacesMarche(req: Request, res: Response) {
    return ok(res, await this.store.listPlacesMarche(req.query.year ? Number(req.query.year) : undefined));
  }

  async createPlaceMarche(req: Request, res: Response) {
    return ok(res, await this.store.createPlaceMarche(req.body || {}), 201);
  }

  async updatePlaceMarche(req: Request, res: Response) {
    return ok(res, await this.store.updatePlaceMarche(String(req.params.id), req.body || {}));
  }

  async listPaiementsMarche(req: Request, res: Response) {
    return ok(res, await this.store.listPaiementsMarche(req.query.year ? Number(req.query.year) : undefined));
  }

  async createPaiementMarche(req: Request, res: Response) {
    return ok(res, await this.store.createPaiementMarche(req.body || {}), 201);
  }

  async marcheStats(req: Request, res: Response) {
    return ok(res, await this.store.getMarcheStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async listMotos(req: Request, res: Response) {
    return ok(
      res,
      await this.store.listMotos(
        req.query.year ? Number(req.query.year) : undefined,
        req.query.search ? String(req.query.search) : undefined,
        req.query.limit ? Number(req.query.limit) : undefined
      )
    );
  }

  async createMoto(req: Request, res: Response) {
    return ok(res, await this.store.createMoto(req.body || {}), 201);
  }

  async updateMoto(req: Request, res: Response) {
    return ok(res, await this.store.updateMoto(String(req.params.id), req.body || {}));
  }

  async changeMotoDriver(req: Request, res: Response) {
    return ok(res, await this.store.changeMotoDriver(String(req.params.id), req.body || {}));
  }

  async motosStats(req: Request, res: Response) {
    return ok(res, await this.store.getMotoStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async motosConfiguration(_req: Request, res: Response) {
    return ok(res, await this.store.getMotoConfiguration());
  }

  async listMotoPayments(req: Request, res: Response) {
    return ok(res, await this.store.listMotoPayments(req.query.year ? Number(req.query.year) : undefined));
  }

  async createMotoPayment(req: Request, res: Response) {
    return ok(res, await this.store.createMotoPayment(req.body || {}), 201);
  }

  auditList(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    return ok(res, {
      logs: [],
      stats: { total: 0, success: 0, warning: 0, error: 0 },
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  auditSeed(_req: Request, res: Response) {
    return message(res, 'Logs de démonstration générés');
  }

  auditExport(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
    res.send('date,user,action,module,status\n');
  }

  async quaiPecheStats(_req: Request, res: Response) {
    return ok(res, await this.store.getQuaiPecheStats());
  }

  async createQuaiResource(
    collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions',
    req: Request,
    res: Response
  ) {
    return ok(res, await this.store.createQuaiResource(collection, req.body || {}), 201);
  }

  async markRead(req: Request, res: Response) {
    await this.store.markNotificationRead(String(req.params.id));
    return message(res, 'Mise à jour effectuée');
  }

  async markAllRead(_req: Request, res: Response) {
    await this.store.markAllNotificationsRead();
    return message(res, 'Mise à jour effectuée');
  }

  async getTarifs(_req: Request, res: Response) {
    return ok(res, await this.store.getTarifs());
  }

  async getPenalites(_req: Request, res: Response) {
    return ok(res, await this.store.getPenalites());
  }

  async getPermissions(_req: Request, res: Response) {
    return ok(res, await this.store.getPermissions());
  }

  async settingsSeed(_req: Request, res: Response) {
    await this.store.seedSettings();
    return message(res, 'Paramètres seedés');
  }

  async createBackup(_req: Request, res: Response) {
    return ok(res, await this.store.createBackupRecord());
  }

  async restoreBackup(_req: Request, res: Response) {
    return message(res, 'Restauration lancée');
  }

  async downloadBackup(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send('');
  }

  async years(_req: Request, res: Response) {
    return ok(res, []);
  }

  async currentYear(_req: Request, res: Response) {
    return ok(res, { annee: new Date().getFullYear(), estActive: true });
  }

  async autoCreateYear(_req: Request, res: Response) {
    return message(res, 'Année créée automatiquement');
  }

  async uploadImage(req: Request, res: Response) {
    const extension = req.file?.originalname?.split('.').pop() || 'jpg';
    return ok(
      res,
      {
        publicId: `upload-${Date.now()}`,
        url: `https://cdn.orbyteconsulting.tech/uploads/${Date.now()}.${extension}`,
        format: extension,
        width: 0,
        height: 0,
      },
      201
    );
  }

  async deleteImage(_req: Request, res: Response) {
    return message(res, 'Image supprimée');
  }

  async listBudgetLignes(req: Request, res: Response) {
    return ok(res, await this.store.listBudgetLignes(req.query.year ? Number(req.query.year) : undefined));
  }

  async createBudgetLigne(req: Request, res: Response) {
    return ok(res, await this.store.createBudgetLigne(req.body || {}), 201);
  }

  async updateBudgetLigne(req: Request, res: Response) {
    return ok(res, await this.store.updateBudgetLigne(String(req.params.id), req.body || {}));
  }

  async deleteBudgetLigne(req: Request, res: Response) {
    await this.store.deleteBudgetLigne(String(req.params.id));
    return message(res, 'Ligne budgétaire supprimée');
  }

  async getBudgetStats(req: Request, res: Response) {
    return ok(res, await this.store.getBudgetStats(req.query.year ? Number(req.query.year) : undefined));
  }

  async listBudgetDemandes(req: Request, res: Response) {
    return ok(res, await this.store.listBudgetDemandes(req.query.year ? Number(req.query.year) : undefined));
  }

  async createBudgetDemande(req: Request, res: Response) {
    return ok(res, await this.store.createBudgetDemande(req.body || {}), 201);
  }

  async updateBudgetDemande(req: Request, res: Response) {
    return ok(res, await this.store.updateBudgetDemande(String(req.params.id), req.body || {}));
  }
}
