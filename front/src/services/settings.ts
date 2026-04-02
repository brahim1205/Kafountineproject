import { apiRequest } from './api';
import { getAuthToken } from './auth';

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

export interface Permission {
  module: string;
  agent: boolean;
  superviseur: boolean;
  comptable: boolean;
  admin: boolean;
}

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

// TARIFS
export async function getTarifs(): Promise<Tarif[]> {
  return apiRequest<Tarif[]>('/settings/tarifs');
}

export async function createTarif(data: { categorie: string; nom: string; montant: number; unite: string; description?: string }): Promise<Tarif> {
  return apiRequest<Tarif>('/settings/tarifs', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTarif(id: string, data: Partial<Tarif>): Promise<Tarif> {
  return apiRequest<Tarif>(`/settings/tarifs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTarif(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/settings/tarifs/${id}`, { method: 'DELETE' });
}

// PENALITES
export async function getPenalites(): Promise<Penalite[]> {
  return apiRequest<Penalite[]>('/settings/penalites');
}

export async function createPenalite(data: { type: string; description?: string; montant: number; delai: string }): Promise<Penalite> {
  return apiRequest<Penalite>('/settings/penalites', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePenalite(id: string, data: Partial<Penalite>): Promise<Penalite> {
  return apiRequest<Penalite>(`/settings/penalites/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePenalite(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/settings/penalites/${id}`, { method: 'DELETE' });
}

// PERMISSIONS
export async function getPermissions(): Promise<Permission[]> {
  return apiRequest<Permission[]>('/settings/permissions');
}

export async function updatePermission(data: { role: string; module: string; enabled: boolean }): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/settings/permissions', { method: 'POST', body: JSON.stringify(data) });
}

// SEED
export async function seedSettings(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/settings/seed', { method: 'POST' });
}

export async function listBackups(): Promise<BackupFile[]> {
  return apiRequest<BackupFile[]>('/settings/backups');
}

export async function createBackup(): Promise<BackupFile | null> {
  return apiRequest<BackupFile | null>('/settings/backups', { method: 'POST' });
}

export async function restoreBackup(filename: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/settings/backups/restore', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

export async function downloadBackup(filename: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`/api/v1/settings/backups/${encodeURIComponent(filename)}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erreur lors du téléchargement de la sauvegarde');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
