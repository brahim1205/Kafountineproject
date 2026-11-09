import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


const API_BASE_URL = '/api/v1';

export interface AuditLog {
  id: string;
  date: string;
  time: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  ipAddress?: string;
}

export interface AuditStats {
  total: number;
  success: number;
  warning: number;
  error: number;
}

export interface AuditResponse {
  logs: AuditLog[];
  stats: AuditStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly api = inject(ApiService);


  async getAuditLogs(params?: {
  year?: number;
  search?: string;
  module?: string;
  statut?: string;
  page?: number;
  limit?: number;
}): Promise<AuditResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.year) queryParams.set('year', String(params.year));
  if (params?.search) queryParams.set('search', params.search);
  if (params?.module) queryParams.set('module', params.module);
  if (params?.statut) queryParams.set('statut', params.statut);
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return this.api.request<AuditResponse>(`/audit${query}`);
}

  async seedAuditLogs(): Promise<{ success: boolean; message: string }> {
  return this.api.request<{ success: boolean; message: string }>('/audit/seed', { method: 'POST' });
}

  async exportAuditLogs(year: number): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/audit/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ year }),
  });
  
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Erreur lors de l\'export');
  }
  
  return response.blob();
}
}
