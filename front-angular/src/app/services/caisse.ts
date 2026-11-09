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

@Injectable({ providedIn: 'root' })
export class CaisseApi {
  private readonly api = inject(ApiService);

  journal(date: string, agentId?: string): Promise<JournalCaisse> {
    const query = new URLSearchParams({ date });
    if (agentId) query.set('agentId', agentId);
    return this.api.request<JournalCaisse>(`/caisse/journal?${query}`);
  }

  synthese(date: string): Promise<SyntheseCaisse> {
    return this.api.request<SyntheseCaisse>(`/caisse/synthese?date=${encodeURIComponent(date)}`);
  }

  cloturer(payload: { date: string; agentId: string; montantCompte: number; observations?: string }): Promise<Cloture> {
    return this.api.request<Cloture>('/caisse/clotures', { method: 'POST', body: JSON.stringify(payload) });
  }

  valider(id: string): Promise<Cloture> {
    return this.api.request<Cloture>(`/caisse/clotures/${id}/valider`, { method: 'POST', body: '{}' });
  }

  rouvrir(id: string, motif: string): Promise<unknown> {
    return this.api.request(`/caisse/clotures/${id}/rouvrir`, { method: 'POST', body: JSON.stringify({ motif }) });
  }
}
