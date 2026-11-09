import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


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

@Injectable({ providedIn: 'root' })
export class BudgetApi {
  private readonly api = inject(ApiService);


  listLignesBudgetaires = (year: number) => this.api.request<LigneBudgetaire[]>(`/budget/lignes?year=${year}`);

  createLigneBudgetaire = (payload: LigneBudgetairePayload) =>
  this.api.request<LigneBudgetaire>('/budget/lignes', { method: 'POST', body: JSON.stringify(payload) });

  updateLigneBudgetaire = (id: string, payload: LigneBudgetairePayload) =>
  this.api.request<LigneBudgetaire>(`/budget/lignes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

  deleteLigneBudgetaire = (id: string) => this.api.request<{ message: string }>(`/budget/lignes/${id}`, { method: 'DELETE' });

  tauxRealisation = (ligne: Pick<LigneBudgetaire, 'prevu' | 'depense'>) =>
  ligne.prevu > 0 ? Math.round((ligne.depense / ligne.prevu) * 100) : 0;
}
