import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


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

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly api = inject(ApiService);


  async listNotifications(params?: ListNotificationsParams) {
  const queryParams = params?.year ? `?year=${params.year}` : '';
  try {
    return await this.api.request<AppNotification[]>(`/notifications${queryParams}`);
  } catch {
    return [];
  }
}

  async markNotificationRead(id: string) {
  return this.api.request<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

  async markAllNotificationsRead() {
  return this.api.request<{ message: string }>('/notifications/read-all', { method: 'PATCH' });
}
}
