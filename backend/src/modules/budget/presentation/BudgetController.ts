import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { BudgetService } from '../application/BudgetService';

export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  async listLines(req: Request, res: Response) {
    return ok(res, await this.budgetService.listLines(yearFrom(req.query)));
  }

  async createLine(req: Request, res: Response) {
    return ok(res, await this.budgetService.createLine(actorFrom(req), req.body || {}), 201);
  }

  async updateLine(req: Request, res: Response) {
    return ok(res, await this.budgetService.updateLine(actorFrom(req), String(req.params.id), req.body || {}));
  }

  async deleteLine(req: Request, res: Response) {
    await this.budgetService.deleteLine(actorFrom(req), String(req.params.id));
    return message(res, 'Ligne budgétaire supprimée');
  }

  async getStats(req: Request, res: Response) {
    return ok(res, await this.budgetService.getStats(yearFrom(req.query)));
  }

  async listRequests(req: Request, res: Response) {
    return ok(res, await this.budgetService.listRequests(yearFrom(req.query)));
  }

  async createRequest(req: Request, res: Response) {
    return ok(res, await this.budgetService.createRequest(actorFrom(req), req.body || {}), 201);
  }

  async updateRequest(req: Request, res: Response) {
    return ok(res, await this.budgetService.updateRequest(actorFrom(req), String(req.params.id), req.body || {}));
  }
}
