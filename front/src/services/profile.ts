import { apiRequest } from './api';
import type { CurrentUser } from './auth';

export async function getMyProfile(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
