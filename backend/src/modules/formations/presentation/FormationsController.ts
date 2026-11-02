import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { FormationService } from '../application/FormationService';

export class FormationsController {
  constructor(private readonly formationService: FormationService) {}

  async listFormations(req: Request, res: Response) {
    return ok(res, await this.formationService.listFormations(yearFrom(req.query)));
  }

  async createFormation(req: Request, res: Response) {
    return ok(res, await this.formationService.createFormation(actorFrom(req), req.body || {}), 201);
  }

  async updateFormation(req: Request, res: Response) {
    return ok(res, await this.formationService.updateFormation(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async deleteFormation(req: Request, res: Response) {
    await this.formationService.deleteFormation(actorFrom(req), String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async getStats(req: Request, res: Response) {
    return ok(res, await this.formationService.getStats(yearFrom(req.query)));
  }

  async listJeunes(req: Request, res: Response) {
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return ok(res, await this.formationService.listJeunes(yearFrom(req.query), search, limit));
  }

  async createJeune(req: Request, res: Response) {
    return ok(res, await this.formationService.createJeune(actorFrom(req), req.body || {}), 201);
  }

  async deleteJeune(req: Request, res: Response) {
    await this.formationService.deleteJeune(actorFrom(req), String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async inscrireJeune(req: Request, res: Response) {
    await this.formationService.inscrireJeune(actorFrom(req), String(req.params.id), String(req.params.formationId));
    return ok(res, { success: true }, 201);
  }
}
