import type { Request, Response } from 'express';
import { message, ok, okWithMeta } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { ActorDirectory } from '../../../shared/audit/AuditTrail';
import type { UrbanismeService } from '../application/UrbanismeService';

export class UrbanismeController {
  constructor(
    private readonly urbanismeService: UrbanismeService,
    private readonly actors: ActorDirectory
  ) {}

  async list(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    const { data, total } = await this.urbanismeService.list({
      page,
      limit,
      year: yearFrom(req.query),
      statut: req.query.statut ? String(req.query.statut).trim().toUpperCase() : '',
      type: req.query.type ? String(req.query.type).trim() : '',
    });
    return okWithMeta(res, data, { page, limit, total });
  }

  async show(req: Request, res: Response) {
    return ok(res, await this.urbanismeService.show(String(req.params.id)));
  }

  async create(req: Request, res: Response) {
    const actor = actorFrom(req);
    const created = await this.urbanismeService.create(actor, req.body || {});
    return ok(res, { ...created, agent: await this.actors.displayName(actor.userId) }, 201);
  }

  async update(req: Request, res: Response) {
    return ok(res, await this.urbanismeService.update(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async delete(req: Request, res: Response) {
    await this.urbanismeService.delete(actorFrom(req), String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async stats(req: Request, res: Response) {
    return ok(res, await this.urbanismeService.stats(yearFrom(req.query)));
  }
}
