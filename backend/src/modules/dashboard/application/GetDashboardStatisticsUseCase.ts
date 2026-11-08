import type { DashboardRepository } from '../domain/DashboardRepository';
import type { TaxCatalog } from '../../transactions/domain/TaxCatalog';
import { buildCategoryLabeler } from '../../transactions/application/categoryLabels';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';

export class GetDashboardStatisticsUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly taxCatalog?: TaxCatalog
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
      evolutionMensuelle,
      topAgentsRaw,
      totalUsers,
      totalAdmins,
      totalAgents,
      formationsStats,
      motosStats,
      marcheStats,
      etatCivilStats,
      urbanismeStats,
      quaiPecheStats,
      budgetStats,
      recettesParSource,
      label,
    ] = await Promise.all([
      this.dashboardRepository.countContribuables(),
      this.dashboardRepository.countTransactionsByYear(year),
      this.dashboardRepository.getPaidRevenueByYear(year),
      this.dashboardRepository.findRecentTransactionsByYear(year, 10),
      this.dashboardRepository.getRevenueByCategoryByYear(year),
      this.dashboardRepository.getTodayRevenueByYear(year),
      this.dashboardRepository.getMonthlyRevenueByYear(year),
      this.dashboardRepository.getWeeklyEvolutionByYear(year),
      this.dashboardRepository.getMonthlyEvolutionByYear(year),
      prisma.transaction.groupBy({
        by: ['agentId'],
        where: { year, statut: 'PAYE' },
        _sum: { montant: true },
        _count: { _all: true },
        orderBy: { _sum: { montant: 'desc' } },
        take: 5,
      }).catch(() => []),
      prisma.user.count().catch(() => 0),
      prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'AGENT' } }).catch(() => 0),
      this.getFormationsStats(year).catch(() => null),
      this.getMotosStats(year).catch(() => null),
      this.getMarcheStats(year).catch(() => null),
      this.getEtatCivilStats(year).catch(() => null),
      this.getUrbanismeStats(year).catch(() => null),
      this.getQuaiPecheStats(year).catch(() => null),
      this.getBudgetStats(year).catch(() => null),
      this.dashboardRepository.getRevenueBySourceByYear(year),
      buildCategoryLabeler(this.taxCatalog),
    ]);

    const byCategory = new Map<string, number>();
    for (const item of categories) {
      const nom = label(item.categorie);
      byCategory.set(nom, (byCategory.get(nom) || 0) + item.montant);
    }

    const transactionsAujourdhui = await this.dashboardRepository.countTodayTransactionsByYear(year);
    const topAgentUsers = topAgentsRaw.length
      ? await prisma.user.findMany({ where: { id: { in: topAgentsRaw.map((item) => item.agentId) } } })
      : [];
    const topAgents = topAgentsRaw.map((item) => {
      const user = topAgentUsers.find((candidate) => candidate.id === item.agentId);
      return {
        nom: user?.nom || 'Agent',
        prenom: user?.prenom || '',
        initiale: user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.trim() || user.nom[0] : 'A',
        collecte: Number(item._sum.montant || 0),
        transactions: item._count._all || 0,
      };
    });

    return {
      totalContribuables,
      totalRecettes,
      totalFormations: formationsStats?.totalFormations ?? 0,
      transactionsAujourdhui,
      transactionsMois: totalTransactions,
      recettesAujourdhui,
      recettesMois,
      tauxRecouvrement: totalContribuables > 0 ? Math.round((totalTransactions / totalContribuables) * 100) : 0,
      totalTransactions,
      totalUsers,
      totalAdmins,
      totalAgents,
      alertes: [
        ...(motosStats?.enRetard ? [{ message: `${motosStats.enRetard} motos en retard de paiement`, type: 'retard', timestamp: new Date().toISOString() }] : []),
        ...(budgetStats?.demandesEnAttente ? [{ message: `${budgetStats.demandesEnAttente} demandes budgétaires en attente`, type: 'info', timestamp: new Date().toISOString() }] : []),
        ...(quaiPecheStats?.commissionsEnAttente ? [{ message: `${quaiPecheStats.commissionsEnAttente} commissions frigorifiques en attente`, type: 'info', timestamp: new Date().toISOString() }] : []),
      ],
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
          enAttente: budgetStats?.demandesEnAttente ?? 0,
        },
        quaiPeche: {
          enAttente: quaiPecheStats?.commissionsEnAttente ?? 0,
        },
        validations: {
          total: urbanismeStats?.total ?? 0,
        },
      },
      // Recettes de tous les modules (taxes, marché, motos, état civil, urbanisme) : base du solde de trésorerie.
      recettesParSource,
      categories: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([categorie, montant]) => ({ categorie, nombre: 0, montant })),
      transactionsRecentes,
      topAgents,
      evolutionSemaine,
      evolutionMensuelle,
    };
  }

  private async getFormationsStats(year: number) {
    const [formations, jeunes, enrollments] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ budget: number; statut: string }>>('SELECT "budget", "statut" FROM "TrainingProgram" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "YouthProfile" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<{ statutFinal: string }>>(
        `SELECT e."statutFinal"
         FROM "YouthEnrollment" e
         INNER JOIN "TrainingProgram" f ON f."id" = e."formationId"
         WHERE f."year" = $1`,
        year
      ),
    ]);
    const totalCertifies = enrollments.filter((item) => item.statutFinal === 'Certifié').length;
    return {
      totalFormations: formations.length,
      formationsEnCours: formations.filter((item) => item.statut === 'EN_COURS').length,
      formationsTerminees: formations.filter((item) => item.statut === 'TERMINEE').length,
      totalJeunes: jeunes.length,
      totalJeunesFormes: jeunes.length,
      certifies: totalCertifies,
      totalCertifies,
      budgetTotal: formations.reduce((sum, item) => sum + Number(item.budget || 0), 0),
    };
  }

  private async getMotosStats(year: number) {
    const [motos, paiements] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ enRetard: boolean }>>('SELECT "enRetard" FROM "MotoRegistration" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<{ montant: number }>>('SELECT "montant" FROM "MotoPayment" WHERE "year" = $1', year),
    ]);
    const total = motos.length;
    const enRetard = motos.filter((item) => item.enRetard).length;
    const recettes = paiements.reduce((sum, item) => sum + Number(item.montant || 0), 0);
    return {
      totalMotos: total,
      enRetard,
      paiementsMois: paiements.length,
      recettesMois: recettes,
      recettesAnnee: recettes,
      tauxPaiement: total > 0 ? Math.round((paiements.length / total) * 100) : 0,
    };
  }

  private async getMarcheStats(year: number) {
    const [places, paiements] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ statut: string; occupantId: string | null }>>('SELECT "statut", "occupantId" FROM "MarketPlace" WHERE "year" = $1', year),
      prisma.$queryRawUnsafe<Array<{ montant: number; statut: string }>>('SELECT "montant", "statut" FROM "MarketPayment" WHERE "year" = $1', year),
    ]);
    const placesTotales = places.length;
    const placesOccupees = places.filter((item) => item.statut === 'OCCUPEE').length;
    return {
      placesTotales,
      placesOccupees,
      placesDisponibles: Math.max(placesTotales - placesOccupees, 0),
      recettesMois: paiements.reduce((sum, item) => sum + Number(item.montant || 0), 0),
      tauxOccupation: placesTotales > 0 ? Math.round((placesOccupees / placesTotales) * 100) : 0,
      nouveauxCommercants: places.filter((item) => item.occupantId).length,
      recettesEnRetard: paiements.filter((item) => item.statut !== 'PAYE').reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  private async getEtatCivilStats(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ montant: number; statut: string }>>(
      'SELECT "montant", "statut" FROM "EtatCivilRequest" WHERE "year" = $1',
      year
    );
    const demandesEnAttente = rows.filter((item) => item.statut === 'EN_ATTENTE').length;
    const demandesDelivrees = rows.filter((item) => item.statut === 'DELIVREE' || item.statut === 'VALIDE').length;
    return {
      totalDemandes: rows.length,
      demandesEnAttente,
      demandesDelivrees,
      recettes: rows.reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  private async getUrbanismeStats(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ montant: number; statut: string }>>(
      'SELECT "montant", "statut" FROM "UrbanismeCase" WHERE "year" = $1',
      year
    );
    const enAttente = rows.filter((item) => item.statut === 'EN_ATTENTE').length;
    const valide = rows.filter((item) => item.statut === 'VALIDE').length;
    return {
      total: rows.length,
      totalDossiers: rows.length,
      enAttente,
      valide,
      dossiersEnAttente: enAttente,
      dossiersValides: valide,
      recettes: rows.reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  private async getQuaiPecheStats(year: number) {
    const [commissions] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ poids: number; statut: string }>>('SELECT "poids", "statut" FROM "FishCommission" WHERE "year" = $1', year),
    ]);
    return {
      totalCommissions: commissions.length,
      totalPoids: commissions.reduce((sum, item) => sum + Number(item.poids || 0), 0),
      commissionsEnAttente: commissions.filter((item) => item.statut === 'ENREGISTREE').length,
    };
  }

  private async getBudgetStats(year: number) {
    const rows = await prisma.$queryRawUnsafe<Array<{ statut: string }>>(
      'SELECT "statut" FROM "BudgetRequest" WHERE "year" = $1',
      year
    );
    return {
      demandesEnAttente: rows.filter((item) => item.statut === 'EN_ATTENTE').length,
    };
  }
}
