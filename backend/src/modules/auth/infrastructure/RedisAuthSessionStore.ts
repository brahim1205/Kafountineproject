import type { AuthSessionStore } from '../domain/AuthSessionStore';
import { getRedisClient } from '../../../shared/infrastructure/redis/getRedisClient';

type SessionRecord = {
  refreshToken: string;
  expiresAt: number;
};

const fallbackSessions = new Map<string, SessionRecord>();

export class RedisAuthSessionStore implements AuthSessionStore {
  private buildKey(userId: string, sessionId: string) {
    return `auth:session:${userId}:${sessionId}`;
  }

  private getFallbackRecord(key: string) {
    const record = fallbackSessions.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      fallbackSessions.delete(key);
      return null;
    }

    return record;
  }

  async save(userId: string, sessionId: string, refreshToken: string, ttlSeconds: number) {
    const key = this.buildKey(userId, sessionId);
    const client = await getRedisClient();
    if (client) {
      await client.set(key, refreshToken, {
        EX: ttlSeconds,
      });
      fallbackSessions.delete(key);
      return;
    }

    fallbackSessions.set(key, {
      refreshToken,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async find(userId: string, sessionId: string) {
    const key = this.buildKey(userId, sessionId);
    const client = await getRedisClient();
    if (client) {
      return client.get(key);
    }

    return this.getFallbackRecord(key)?.refreshToken ?? null;
  }

  async delete(userId: string, sessionId: string) {
    const key = this.buildKey(userId, sessionId);
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
      return;
    }

    fallbackSessions.delete(key);
  }
}
