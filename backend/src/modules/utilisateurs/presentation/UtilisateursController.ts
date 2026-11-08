import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom } from '../../../shared/presentation/requestContext';
import type { UtilisateurService } from '../application/UtilisateurService';

export class UtilisateursController {
  constructor(private readonly utilisateurService: UtilisateurService) {}

  async list(req: Request, res: Response) {
    return ok(res, await this.utilisateurService.list(String(req.query.search || ''), req.user?.role));
  }

  async create(req: Request, res: Response) {
    return ok(res, await this.utilisateurService.create(actorFrom(req), req.body || {}), 201);
  }

  async update(req: Request, res: Response) {
    return ok(res, await this.utilisateurService.update(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async delete(req: Request, res: Response) {
    return message(res, await this.utilisateurService.delete(actorFrom(req), String(req.params.id)));
  }
}
