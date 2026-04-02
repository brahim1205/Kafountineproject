import type { Request, Response } from 'express';
import { ok } from '../../../shared/http/response';
import { GetDashboardStatisticsUseCase } from '../application/GetDashboardStatisticsUseCase';

export class DashboardController {
  constructor(private readonly getDashboardStatisticsUseCase: GetDashboardStatisticsUseCase) {}

  async statistiques(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.getDashboardStatisticsUseCase.execute(year));
  }
}
