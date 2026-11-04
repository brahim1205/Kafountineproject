import type { AuthUser } from './User';

export interface UserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}
