import type { Request, Response } from 'express';
import { ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { MarcheService } from '../application/MarcheService';

export class MarcheController {
  constructor(private readonly marcheService: MarcheService) {}

  async listPlaces(req: Request, res: Response) {
    return ok(res, await this.marcheService.listPlaces(yearFrom(req.query)));
  }

  async createPlace(req: Request, res: Response) {
    return ok(res, await this.marcheService.createPlace(actorFrom(req), req.body || {}), 201);
  }

  async updatePlace(req: Request, res: Response) {
    return ok(res, await this.marcheService.updatePlace(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async listPayments(req: Request, res: Response) {
    return ok(res, await this.marcheService.listPayments(yearFrom(req.query)));
  }

  async createPayment(req: Request, res: Response) {
    return ok(res, await this.marcheService.createPayment(actorFrom(req), req.body || {}), 201);
  }

  async stats(req: Request, res: Response) {
    return ok(res, await this.marcheService.stats(yearFrom(req.query)));
  }
}
