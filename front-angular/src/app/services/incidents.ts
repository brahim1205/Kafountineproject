import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';

export type StatutIncident = 'nouveau' | 'en_cours' | 'traite';
export type SourceIncident = 'serveur' | 'navigateur';

export interface Incident {
  id: string;
  source: SourceIncident;
  lieu: string;
  message: string;
  requestId: string | null;
  userName: string | null;
  role: string | null;
  occurrences: number;
  premiereFois: string;
  derniereFois: string;
  statut: StatutIncident;
  note: string | null;
  traitePar: string | null;
  traiteLe: string | null;
}

export interface IncidentStats {
  nouveau: number;
  enCours: number;
  traite: number;
  occurrences24h: number;
}

export interface IncidentsResponse {
  incidents: Incident[];
  stats: IncidentStats;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface IncidentsFiltre {
  statut?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApi {
  private readonly api = inject(ApiService);

  list(filtre: IncidentsFiltre): Promise<IncidentsResponse> {
    const query = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(filtre)) {
      if (valeur !== undefined && valeur !== '' && valeur !== 'all') query.set(cle, String(valeur));
    }
    const suffixe = query.toString() ? `?${query}` : '';
    return this.api.request<IncidentsResponse>(`/incidents${suffixe}`);
  }

  stats(): Promise<IncidentStats> {
    return this.api.request<IncidentStats>('/incidents/stats');
  }

  mettreAJour(id: string, statut: StatutIncident, note: string): Promise<Incident> {
    return this.api.request<Incident>(`/incidents/${id}`, { method: 'PATCH', body: { statut, note } });
  }
}
