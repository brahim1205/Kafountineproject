import { apiRequest } from './api';

export type LigneBudgetaire = {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense: number;
  year: number;
};

export type DemandeBudgetaire = {
  id: string;
  service: string;
  description: string;
  montant: number;
  statut: string;
  motif: string | null;
  year: number;
  createdAt: string;
};

export type BudgetStats = {
  totalPrevu: number;
  totalDepense: number;
  totalReste: number;
  tauxExecution: number;
  nombreLignes: number;
  demandesEnAttente: number;
  demandesApprouvees: number;
  demandesRejetees: number;
};

export type LigneBudgetairePayload = {
  code: string;
  libelle: string;
  description: string | null;
  prevu: number;
  depense?: number;
  year?: number;
};

export const listLignesBudgetaires = (year: number) => apiRequest<LigneBudgetaire[]>(`/budget/lignes?year=${year}`);

export const createLigneBudgetaire = (payload: LigneBudgetairePayload) =>
  apiRequest<LigneBudgetaire>('/budget/lignes', { method: 'POST', body: JSON.stringify(payload) });

export const updateLigneBudgetaire = (id: string, payload: LigneBudgetairePayload) =>
  apiRequest<LigneBudgetaire>(`/budget/lignes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteLigneBudgetaire = (id: string) => apiRequest<{ message: string }>(`/budget/lignes/${id}`, { method: 'DELETE' });

/** Part du budget prévu déjà dépensée, en pourcentage entier (0 si rien n'est prévu). */
export const tauxRealisation = (ligne: Pick<LigneBudgetaire, 'prevu' | 'depense'>) =>
  ligne.prevu > 0 ? Math.round((ligne.depense / ligne.prevu) * 100) : 0;
