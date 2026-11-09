import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';
import type { CurrentUser } from '../core/auth/auth.models';



@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly api = inject(ApiService);


  async getMyProfile(): Promise<CurrentUser> {
  return this.api.request<CurrentUser>('/auth/me');
}

  async changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await this.api.request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
}
