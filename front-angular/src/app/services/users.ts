import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


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

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly api = inject(ApiService);


  async listUsers(search = ''): Promise<UserItem[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return this.api.request<UserItem[]>(`/users${suffix}`);
}

  async createUser(payload: {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  telephone?: string;
  password?: string;
}) {
  return this.api.request<UserItem>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

  async updateUser(id: string, payload: Partial<UserItem> & { password?: string }) {
  return this.api.request<UserItem>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

  async deleteUser(id: string) {
  return this.api.request<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
  });
}
}
