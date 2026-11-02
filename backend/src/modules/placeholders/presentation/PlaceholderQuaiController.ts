import type { Request, Response } from 'express';
import { ok, message } from '../../../shared/http/response';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { PlaceholderQuaiService } from './PlaceholderQuaiService';
import { PlaceholderSupportService } from './PlaceholderSupportService';

export class PlaceholderQuaiController {
  private readonly quaiService: PlaceholderQuaiService;

  constructor(supportService: PlaceholderSupportService) {
    this.quaiService = new PlaceholderQuaiService(supportService);
  }

  async listCollection(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.quaiService.listCollection(collection, year));
  }

  async getCollectionItem(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', req: Request, res: Response) {
    return ok(res, await this.quaiService.getCollectionItem(collection, String(req.params.id)));
  }

  async createResource(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', req: Request, res: Response) {
    return ok(res, await this.quaiService.createResource(collection, req as AuthRequest), 201);
  }

  async updateResource(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', req: Request, res: Response) {
    return ok(res, await this.quaiService.updateResource(collection, req as AuthRequest));
  }

  async deleteResource(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', req: Request, res: Response) {
    await this.quaiService.deleteResource(collection, req as AuthRequest);
    return message(res, 'Suppression effectuée');
  }

  async getStats(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.quaiService.getStats(year));
  }
}
