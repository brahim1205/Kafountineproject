import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api/api.service';

export interface LigneImpaye {
  type: 'MOTO' | 'MARCHE';
  id: string;
  reference: string;
  libelle: string;
  contribuableId: string | null;
  contribuable: string;
  telephone: string | null;
  montant: number;
  echeance: string | null;
}

export interface Impayes {
  total: number;
  montantMotos: number;
  montantMarche: number;
  nombre: number;
  lignes: LigneImpaye[];
}

export interface FicheContribuable {
  id: string;
  nin: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
  typeContribuable: string;
}

export interface OperationContribuable {
  source: string;
  numero: string;
  libelle: string;
  montant: number;
  date: string;
}

export interface Situation {
  contribuable: FicheContribuable;
  year: number;
  totalPaye: number;
  totalDu: number;
  parSource: Record<string, number>;
  operations: OperationContribuable[];
  impayes: LigneImpaye[];
}

@Injectable({ providedIn: 'root' })
export class RecouvrementApi {
  private readonly api = inject(ApiService);

  impayes(): Promise<Impayes> {
    return this.api.request<Impayes>('/impayes?limit=1000');
  }

  situation(id: string, year: number): Promise<Situation> {
    return this.api.request<Situation>(`/contribuables/${id}/situation?year=${year}`);
  }

  async rechercher(search: string, page: number, limit: number) {
    return firstValueFrom(this.api.getPage<FicheContribuable>('/contribuables', { search, page, limit }));
  }
}
