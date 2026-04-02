import { apiRequest } from './api';

export type UserItem = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
};

export async function listUsers(search = ''): Promise<UserItem[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<UserItem[]>(`/users${suffix}`);
}

export async function createUser(payload: {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone?: string;
  password?: string;
}) {
  return apiRequest<UserItem>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: Partial<UserItem>) {
  return apiRequest<UserItem>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string) {
  return apiRequest<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

