import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';

export interface LigneCaisse {
  source: string;
  numero: string;
  libelle: string;
  montant: number;
  mode: string;
  date: string;
}

export interface Cloture {
  id: string;
  jour: string;
  agentId: string;
  agent: string;
  montantAttendu: number;
  montantCompte: number;
  ecart: number;
  nombre: number;
  observations: string | null;
  statut: 'CLOTUREE' | 'VALIDEE';
}

export interface JournalCaisse {
  date: string;
  agentId: string;
  agent: string;
  total: number;
  nombre: number;
  parMode: Record<string, number>;
  parSource: Record<string, number>;
  lignes: LigneCaisse[];
  cloture: Cloture | null;
}

export interface SyntheseAgent {
  agentId: string;
  agent: string;
  montant: number;
  nombre: number;
  cloture: Cloture | null;
}

export interface SyntheseCaisse {
  date: string;
  total: number;
  agents: SyntheseAgent[];
}

export type PeriodeActivite = 'jour' | 'semaine' | 'mois';

export interface ActiviteAgent {
  agentId: string;
  agent: string;
  role: string;
  total: number;
  nombre: number;
  parModule: Record<string, number>;
}

/** Ce que chaque agent a enregistré sur la période, ventilé par module. */
export interface ActiviteAgents {
  periode: PeriodeActivite;
  debut: string;
  fin: string;
  modules: string[];
  total: number;
  nombre: number;
  parModule: Record<string, number>;
  agents: ActiviteAgent[];
}

@Injectable({ providedIn: 'root' })
export class CaisseApi {
  private readonly api = inject(ApiService);

  journal(date: string, agentId?: string): Promise<JournalCaisse> {
    const query = new URLSearchParams({ date });
    if (agentId) query.set('agentId', agentId);
    return this.api.request<JournalCaisse>(`/caisse/journal?${query}`);
  }

  activite(periode: PeriodeActivite, date: string): Promise<ActiviteAgents> {
    return this.api.request<ActiviteAgents>(`/caisse/activite?${new URLSearchParams({ periode, date })}`);
  }

  synthese(date: string): Promise<SyntheseCaisse> {
    return this.api.request<SyntheseCaisse>(`/caisse/synthese?date=${encodeURIComponent(date)}`);
  }

  cloturer(payload: { date: string; agentId: string; montantCompte: number; observations?: string }): Promise<Cloture> {
    return this.api.request<Cloture>('/caisse/clotures', { method: 'POST', body: JSON.stringify(payload) });
  }

  /** Clôtures, les plus récentes d'abord ; « CLOTUREE » = en attente de validation. */
  clotures(statut?: Cloture['statut'], limit = 20): Promise<Cloture[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (statut) query.set('statut', statut);
    return this.api.request<Cloture[]>(`/caisse/clotures?${query}`);
  }

  valider(id: string): Promise<Cloture> {
    return this.api.request<Cloture>(`/caisse/clotures/${id}/valider`, { method: 'POST', body: '{}' });
  }

  rouvrir(id: string, motif: string): Promise<unknown> {
    return this.api.request(`/caisse/clotures/${id}/rouvrir`, { method: 'POST', body: JSON.stringify({ motif }) });
  }
}
