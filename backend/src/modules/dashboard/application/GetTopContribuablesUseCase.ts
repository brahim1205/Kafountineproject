import { DashboardRepository } from '../domain/DashboardRepository';

export class GetTopContribuablesUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(year: number, limit: number) {
    return this.dashboardRepository.getTopContribuables(year, limit);
  }
}
