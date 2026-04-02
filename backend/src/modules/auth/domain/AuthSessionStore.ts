export interface AuthSessionStore {
  save(userId: string, sessionId: string, refreshToken: string, ttlSeconds: number): Promise<void>;
  find(userId: string, sessionId: string): Promise<string | null>;
  delete(userId: string, sessionId: string): Promise<void>;
}
