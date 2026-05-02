export interface DashboardRepository {
  countContribuables(): Promise<number>;
  countTransactionsByYear(year: number): Promise<number>;
  findRecentTransactionsByYear(year: number, limit: number): Promise<Array<{
    id: string;
    numero: string;
    montant: number;
    agent?: { nom: string; prenom: string } | null;
  }>>;
  getPaidRevenueByYear(year: number): Promise<number>;
  getRevenueByCategoryByYear(year: number): Promise<Array<{ categorie: string; montant: number }>>;
  countTodayTransactionsByYear(year: number): Promise<number>;
  getTodayRevenueByYear(year: number): Promise<number>;
  getMonthlyRevenueByYear(year: number): Promise<number>;
  getWeeklyEvolutionByYear(year: number): Promise<Array<{ jour: string; montant: number; transactions: number }>>;
  getMonthlyEvolutionByYear(year: number): Promise<Array<{ mois: string; montant: number; transactions: number }>>;
  getTopContribuables(year: number, limit: number): Promise<Array<{ id: string; prenom: string; nom: string; montantTotal: number }>>;
}
