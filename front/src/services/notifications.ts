import { apiRequest } from './api';

export type AppNotification = {
  id: string;
  userId: string;
  type: string;
  titre: string;
  message: string;
  montant?: number | null;
  contribuable?: string | null;
  agent?: string | null;
  lu: boolean;
  timestamp: string;
};

interface ListNotificationsParams {
  year?: number;
}

export async function listNotifications(params?: ListNotificationsParams) {
  const queryParams = params?.year ? `?year=${params.year}` : '';
  return apiRequest<AppNotification[]>(`/notifications${queryParams}`);
}

export async function markNotificationRead(id: string) {
  return apiRequest<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiRequest<{ message: string }>('/notifications/read-all', { method: 'PATCH' });
}

