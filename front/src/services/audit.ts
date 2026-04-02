import { apiRequest } from './api';
import { getAuthToken } from './auth';
import { resolveApiBaseUrl } from './apiBaseUrl';

const API_BASE_URL = resolveApiBaseUrl();

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

export async function getAuditLogs(params?: {
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
  return apiRequest<AuditResponse>(`/audit${query}`);
}

export async function seedAuditLogs(): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/audit/seed', { method: 'POST' });
}

export async function exportAuditLogs(year: number): Promise<Blob> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/audit/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ year }),
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de l\'export');
  }
  
  return response.blob();
}
