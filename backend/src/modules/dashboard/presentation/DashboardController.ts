import type { Request, Response } from 'express';
import { ok } from '../../../shared/http/response';
import { GetDashboardStatisticsUseCase } from '../application/GetDashboardStatisticsUseCase';
import { GetTopContribuablesUseCase } from '../application/GetTopContribuablesUseCase';

export class DashboardController {
  constructor(
    private readonly getDashboardStatisticsUseCase: GetDashboardStatisticsUseCase,
    private readonly getTopContribuablesUseCase: GetTopContribuablesUseCase
  ) {}

  async statistiques(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.getDashboardStatisticsUseCase.execute(year));
  }

  async topContribuables(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    return ok(res, await this.getTopContribuablesUseCase.execute(year, limit));
  }
}
