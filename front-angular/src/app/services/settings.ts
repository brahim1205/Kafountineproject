import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


export interface Tarif {
  id: string;
  categorie: string;
  nom: string;
  montant: number;
  unite: string;
  description?: string;
  actif: boolean;
}

export interface Penalite {
  id: string;
  type: string;
  description?: string;
  montant: number;
  delai: string;
  actif: boolean;
}

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiService);


  async getTarifs(): Promise<Tarif[]> {
  return this.api.request<Tarif[]>('/settings/tarifs');
}

  async createTarif(data: { categorie: string; nom: string; montant: number; unite: string; description?: string; actif?: boolean }): Promise<Tarif> {
  return this.api.request<Tarif>('/settings/tarifs', { method: 'POST', body: JSON.stringify(data) });
}

  async updateTarif(id: string, data: Partial<Tarif>): Promise<Tarif> {
  return this.api.request<Tarif>(`/settings/tarifs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

  async deleteTarif(id: string): Promise<{ message: string }> {
  return this.api.request<{ message: string }>(`/settings/tarifs/${id}`, { method: 'DELETE' });
}

  async getPenalites(): Promise<Penalite[]> {
  return this.api.request<Penalite[]>('/settings/penalites');
}

  async createPenalite(data: { type: string; description?: string; montant: number; delai: string }): Promise<Penalite> {
  return this.api.request<Penalite>('/settings/penalites', { method: 'POST', body: JSON.stringify(data) });
}

  async updatePenalite(id: string, data: Partial<Penalite>): Promise<Penalite> {
  return this.api.request<Penalite>(`/settings/penalites/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

  async deletePenalite(id: string): Promise<{ message: string }> {
  return this.api.request<{ message: string }>(`/settings/penalites/${id}`, { method: 'DELETE' });
}

  async listBackups(): Promise<BackupFile[]> {
  return this.api.request<BackupFile[]>('/settings/backups');
}

  async createBackup(): Promise<BackupFile | null> {
  return this.api.request<BackupFile | null>('/settings/backups', { method: 'POST' });
}

  async restoreBackup(filename: string): Promise<{ message: string }> {
  return this.api.request<{ message: string }>('/settings/backups/restore', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

  async downloadBackup(filename: string): Promise<void> {
  const response = await fetch(`/api/v1/settings/backups/${encodeURIComponent(filename)}/download`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Erreur lors du téléchargement de la sauvegarde');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
}
