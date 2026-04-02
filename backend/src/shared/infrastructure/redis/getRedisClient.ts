import { createClient } from 'redis';
import { env } from '../../config/env';

type RedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<RedisClient | null> | null = null;

export async function getRedisClient() {
  if (!env.redisUrl) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const client = createClient({ url: env.redisUrl });
        await client.connect();
        return client;
      } catch {
        return null;
      }
    })();
  }

  return clientPromise;
}
