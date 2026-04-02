import type { AuthSessionStore } from '../domain/AuthSessionStore';
import { getRedisClient } from '../../../shared/infrastructure/redis/getRedisClient';

export class RedisAuthSessionStore implements AuthSessionStore {
  private buildKey(userId: string, sessionId: string) {
    return `auth:session:${userId}:${sessionId}`;
  }

  async save(userId: string, sessionId: string, refreshToken: string, ttlSeconds: number) {
    const client = await getRedisClient();
    if (!client) {
      throw new Error('Redis indisponible pour stocker la session');
    }

    await client.set(this.buildKey(userId, sessionId), refreshToken, {
      EX: ttlSeconds,
    });
  }

  async find(userId: string, sessionId: string) {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    return client.get(this.buildKey(userId, sessionId));
  }

  async delete(userId: string, sessionId: string) {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    await client.del(this.buildKey(userId, sessionId));
  }
}
