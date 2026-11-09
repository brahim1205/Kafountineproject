import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ApiService } from '../api/api.service';

export interface AppNotification {
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
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);

  list(year: number): Observable<AppNotification[]> {
    return this.api.get<AppNotification[]>('/notifications', { year }).pipe(catchError(() => of([])));
  }

  markRead(id: string): Observable<unknown> {
    return this.api.patch(`/notifications/${id}/read`);
  }

  markAllRead(): Observable<unknown> {
    return this.api.patch('/notifications/read-all');
  }
}
