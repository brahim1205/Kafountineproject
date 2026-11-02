import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom } from '../../../shared/presentation/requestContext';
import type { ParametresService } from '../application/ParametresService';

export class ParametresController {
  constructor(private readonly parametresService: ParametresService) {}

  async listTariffs(_req: Request, res: Response) {
    return ok(res, await this.parametresService.listTariffs());
  }

  async createTariff(req: Request, res: Response) {
    return ok(res, await this.parametresService.createTariff(actorFrom(req), req.body || {}), 201);
  }

  async updateTariff(req: Request, res: Response) {
    return ok(res, await this.parametresService.updateTariff(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async deleteTariff(req: Request, res: Response) {
    await this.parametresService.deleteTariff(actorFrom(req), String(req.params.id));
    return message(res, 'Tarif supprimé');
  }

  async listPenalties(_req: Request, res: Response) {
    return ok(res, await this.parametresService.listPenalties());
  }

  async createPenalty(req: Request, res: Response) {
    return ok(res, await this.parametresService.createPenalty(actorFrom(req), req.body || {}), 201);
  }

  async updatePenalty(req: Request, res: Response) {
    return ok(res, await this.parametresService.updatePenalty(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async deletePenalty(req: Request, res: Response) {
    await this.parametresService.deletePenalty(actorFrom(req), String(req.params.id));
    return message(res, 'Pénalité supprimée');
  }

  async listPermissions(_req: Request, res: Response) {
    return ok(res, await this.parametresService.listPermissions());
  }

  async updatePermission(req: Request, res: Response) {
    await this.parametresService.updatePermission(actorFrom(req), req.body || {});
    return message(res, 'Permission mise à jour');
  }

  async listBackups(_req: Request, res: Response) {
    return ok(res, await this.parametresService.listBackups());
  }

  async createBackup(req: Request, res: Response) {
    return ok(res, await this.parametresService.createBackup(actorFrom(req)), 201);
  }

  async restoreBackup(req: Request, res: Response) {
    await this.parametresService.restoreBackup(actorFrom(req), String(req.body?.filename || '').trim());
    return message(res, 'Restauration terminée');
  }

  async downloadBackup(req: Request, res: Response) {
    const backup = await this.parametresService.getBackup(String(req.params.filename || '').trim());
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    res.send(backup.snapshot);
  }
}
