import { getRedisClient } from '../infrastructure/redis/getRedisClient';
import { env } from '../config/env';

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getMemoryCacheKey(key: string): string {
  return `mem:${key}`;
}

export class CacheService {
  private ttlMs: number;
  private enabled: boolean;

  constructor(ttlSeconds?: number) {
    this.ttlMs = (ttlSeconds ?? env.cacheTtlSeconds) * 1000;
    this.enabled = env.cacheEnabled;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    // Try Redis first
    try {
      const client = await getRedisClient();
      if (client) {
        const raw = await client.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      }
    } catch {
      // Redis down, fall through to memory cache
    }

    // Fallback to in-memory cache
    const memKey = getMemoryCacheKey(key);
    const entry = memoryCache.get(memKey) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    if (entry) {
      memoryCache.delete(memKey);
    }
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.enabled) return;

    const ttl = (ttlSeconds ?? this.ttlMs / 1000);

    // Try Redis
    try {
      const client = await getRedisClient();
      if (client) {
        await client.setEx(key, Math.max(1, Math.round(ttl)), JSON.stringify(value));
        return;
      }
    } catch {
      // Redis down, fall through to memory cache
    }

    // Fallback to in-memory cache
    const memKey = getMemoryCacheKey(key);
    memoryCache.set(memKey, {
      data: value as unknown,
      expiresAt: Date.now() + ttl * 1000,
    });

    // Prevent unbounded growth in memory cache
    if (memoryCache.size > 5000) {
      const firstKey = memoryCache.keys().next().value;
      if (firstKey) memoryCache.delete(firstKey);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      if (client) {
        await client.del(key);
      }
    } catch { /* ignore */ }
    memoryCache.delete(getMemoryCacheKey(key));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();
      if (client) {
        for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
          await client.del(key);
        }
      }
    } catch { /* ignore */ }

    // Also clear memory cache keys matching pattern (simple cleanup)
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  }

  generateKey(parts: (string | number | undefined)[]): string {
    return `kaf:${parts.filter(Boolean).join(':')}`;
  }
}

export const defaultCache = new CacheService();

