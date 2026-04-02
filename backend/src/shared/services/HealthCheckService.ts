import { prisma } from '../infrastructure/prisma/prismaClient';
import { getRedisClient } from '../infrastructure/redis/getRedisClient';

export class HealthCheckService {
  async check() {
    let database = false;
    let redis = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch { /* database unavailable */ }

    try {
      const client = await getRedisClient();
      if (client) {
        await client.ping();
        redis = true;
      }
    } catch { /* redis unavailable */ }

    return { database, redis };
  }
}
