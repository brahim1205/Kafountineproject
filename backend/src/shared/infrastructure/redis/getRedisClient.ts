import { createClient } from 'redis';
import { env } from '../../config/env';

type RedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<RedisClient | null> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 30000;

function computeBackoff(attempt: number): number {
  const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
  return delay + Math.random() * 1000; // jitter
}

export async function getRedisClient(): Promise<RedisClient | null> {
  if (!env.redisUrl) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = createClientWithRetry();
  }

  return clientPromise;
}

async function createClientWithRetry(): Promise<RedisClient | null> {
  while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    try {
      const client = createClient({
        url: env.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            reconnectAttempts = retries;
            if (retries > MAX_RECONNECT_ATTEMPTS) {
              return new Error('Max reconnection attempts reached');
            }
            return computeBackoff(retries);
          },
          connectTimeout: 5000,
          keepAlive: 30000,
        },
      });

      client.on('error', (err) => {
        process.stderr.write(`Redis client error: ${(err as Error).message}\n`);
      });

      client.on('reconnecting', () => {
        process.stdout.write('Redis reconnecting...\n');
      });

      await client.connect();
      reconnectAttempts = 0;
      return client;
    } catch (err) {
      reconnectAttempts++;
      const delay = computeBackoff(reconnectAttempts);
      process.stderr.write(
        `Redis connection failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}). Retrying in ${Math.round(delay)}ms... Error: ${(err as Error).message}\n`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  process.stderr.write('Redis unavailable after max reconnect attempts.\n');
  return null;
}

