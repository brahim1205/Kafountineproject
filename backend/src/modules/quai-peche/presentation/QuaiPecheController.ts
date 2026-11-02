import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { QuaiCollection } from '../domain/QuaiPeche';
import type { QuaiPecheService } from '../application/QuaiPecheService';

export class QuaiPecheController {
  constructor(private readonly quaiPecheService: QuaiPecheService) {}

  async list(collection: QuaiCollection, req: Request, res: Response) {
    return ok(res, await this.quaiPecheService.list(collection, yearFrom(req.query)));
  }

  async get(collection: QuaiCollection, req: Request, res: Response) {
    return ok(res, await this.quaiPecheService.get(collection, String(req.params.id)));
  }

  async create(collection: QuaiCollection, req: Request, res: Response) {
    return ok(res, await this.quaiPecheService.create(actorFrom(req), collection, req.body || {}), 201);
  }

  async update(collection: QuaiCollection, req: Request, res: Response) {
    return ok(res, await this.quaiPecheService.update(actorFrom(req), collection, String(req.params.id), req.body || {}));
  }

  async delete(collection: QuaiCollection, req: Request, res: Response) {
    await this.quaiPecheService.delete(actorFrom(req), collection, String(req.params.id));
    return message(res, 'Suppression effectuée');
  }

  async stats(req: Request, res: Response) {
    return ok(res, await this.quaiPecheService.stats(yearFrom(req.query)));
  }
}
