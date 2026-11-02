import type { Request, Response } from 'express';
import { ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { MotoService } from '../application/MotoService';

export class MotosController {
  constructor(private readonly motoService: MotoService) {}

  async list(req: Request, res: Response) {
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    return ok(res, await this.motoService.list(yearFrom(req.query), search, limit));
  }

  async create(req: Request, res: Response) {
    return ok(res, await this.motoService.create(actorFrom(req), req.body || {}), 201);
  }

  async update(req: Request, res: Response) {
    return ok(res, await this.motoService.update(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async stats(req: Request, res: Response) {
    return ok(res, await this.motoService.stats(yearFrom(req.query)));
  }

  async configuration(_req: Request, res: Response) {
    return ok(res, this.motoService.configuration());
  }

  async listPayments(req: Request, res: Response) {
    return ok(res, await this.motoService.listPayments(yearFrom(req.query)));
  }

  async createPayment(req: Request, res: Response) {
    return ok(res, await this.motoService.createPayment(actorFrom(req), req.body || {}), 201);
  }
}
