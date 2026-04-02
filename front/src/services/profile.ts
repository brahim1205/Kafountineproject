import { apiRequest } from './api';
import type { CurrentUser } from './auth';
import { listNotifications, type AppNotification } from './notifications';
import { getTransactions, type TransactionItem } from './taxes';

export type ProfileData = {
  me: CurrentUser;
  transactions: TransactionItem[];
  notifications: AppNotification[];
};

export async function getMyProfile(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

export async function getProfileData(year?: number): Promise<ProfileData> {
  const [me, txResponse, notifications] = await Promise.all([
    getMyProfile(),
    getTransactions({ page: 1, limit: 300 }),
    listNotifications({ year }),
  ]);

  return {
    me,
    transactions: txResponse.data || [],
    notifications: notifications || [],
  };
}
