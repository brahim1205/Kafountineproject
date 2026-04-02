import type { AuthSessionStore } from '../domain/AuthSessionStore';

export class LogoutUseCase {
  constructor(private readonly authSessionStore: AuthSessionStore) {}

  async execute(userId: string, sessionId?: string) {
    if (!sessionId) {
      return;
    }

    await this.authSessionStore.delete(userId, sessionId);
  }
}
