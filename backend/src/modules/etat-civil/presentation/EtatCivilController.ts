import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { ActorDirectory } from '../../../shared/audit/AuditTrail';
import type { EtatCivilService } from '../application/EtatCivilService';

export class EtatCivilController {
  constructor(
    private readonly etatCivilService: EtatCivilService,
    private readonly actors: ActorDirectory
  ) {}

  async list(req: Request, res: Response) {
    return ok(res, await this.etatCivilService.list(yearFrom(req.query)));
  }

  async create(req: Request, res: Response) {
    const actor = actorFrom(req);
    const created = await this.etatCivilService.create(actor, req.body || {});
    return ok(res, { ...created, agent: await this.actors.displayName(actor.userId) }, 201);
  }

  async update(req: Request, res: Response) {
    return ok(res, await this.etatCivilService.update(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async delete(req: Request, res: Response) {
    await this.etatCivilService.delete(actorFrom(req), String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async documentTypes(_req: Request, res: Response) {
    return ok(res, await this.etatCivilService.documentTypes());
  }

  async stats(req: Request, res: Response) {
    return ok(res, await this.etatCivilService.stats(yearFrom(req.query)));
  }
}
