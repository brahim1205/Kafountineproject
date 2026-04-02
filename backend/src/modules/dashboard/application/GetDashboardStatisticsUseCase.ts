import type { DashboardRepository } from '../domain/DashboardRepository';
import type { JsonPlaceholderStore } from '../../placeholders/infrastructure/JsonPlaceholderStore';

export class GetDashboardStatisticsUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly placeholderStore: JsonPlaceholderStore
  ) {}

  async execute(year: number) {
    const [
      totalContribuables,
      totalTransactions,
      totalRecettes,
      transactionsRecentes,
      categories,
      recettesAujourdhui,
      recettesMois,
      evolutionSemaine,
      formationsStats,
      motosStats,
      marcheStats,
      etatCivilStats,
      urbanismeStats,
      quaiPecheStats,
    ] = await Promise.all([
      this.dashboardRepository.countContribuables(),
      this.dashboardRepository.countTransactionsByYear(year),
      this.dashboardRepository.getPaidRevenueByYear(year),
      this.dashboardRepository.findRecentTransactionsByYear(year, 10),
      this.dashboardRepository.getRevenueByCategoryByYear(year),
      this.dashboardRepository.getTodayRevenueByYear(year),
      this.dashboardRepository.getMonthlyRevenueByYear(year),
      this.dashboardRepository.getWeeklyEvolutionByYear(year),
      this.placeholderStore.getFormationStats(year).catch(() => null),
      this.placeholderStore.getMotoStats(year).catch(() => null),
      this.placeholderStore.getMarcheStats(year).catch(() => null),
      this.placeholderStore.getEtatCivilStats(year).catch(() => null),
      this.placeholderStore.getUrbanismeStats(year).catch(() => null),
      this.placeholderStore.getQuaiPecheStats().catch(() => null),
    ]);

    const transactionsAujourdhui = await this.dashboardRepository.countTodayTransactionsByYear(year);
    const totalExpected = totalRecettes > 0 ? totalRecettes : 1;

    return {
      totalContribuables,
      totalRecettes,
      totalFormations: formationsStats?.totalFormations ?? 0,
      transactionsAujourdhui,
      transactionsMois: totalTransactions,
      recettesAujourdhui,
      recettesMois,
      tauxRecouvrement: 100,
      stats: {
        motos: {
          total: motosStats?.totalMotos ?? 0,
          enRetard: motosStats?.enRetard ?? 0,
        },
        marche: {
          total: marcheStats?.placesTotales ?? 0,
          occupees: marcheStats?.placesOccupees ?? 0,
        },
        etatCivil: {
          enAttente: etatCivilStats?.demandesEnAttente ?? 0,
        },
        urbanisme: {
          enAttente: urbanismeStats?.enAttente ?? 0,
        },
        budget: {
          enAttente: 0,
        },
        quaiPeche: {
          enAttente: quaiPecheStats?.commissionsEnAttente ?? 0,
        },
        validations: {
          total: urbanismeStats?.total ?? 0,
        },
      },
      categories: categories.map((c) => ({ nom: c.categorie, montant: c.montant })),
      transactionsRecentes,
      topAgents: [],
      evolutionSemaine,
    };
  }
}
