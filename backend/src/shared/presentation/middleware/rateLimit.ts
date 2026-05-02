import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError';
import { getRedisClient } from '../../infrastructure/redis/getRedisClient';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Nettoyage périodique pour éviter les fuites de mémoire (exécuté toutes les 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req: Request) {
  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || req.ip || 'unknown';
  }

  return req.ip || 'unknown';
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      const key = `${options.keyPrefix}:${getClientIp(req)}`;
      const client = await getRedisClient();

      if (client) {
        const count = await client.incr(key);
        if (count === 1) {
          await client.pExpire(key, options.windowMs);
        }

        if (count > options.max) {
          const ttlMs = await client.pTTL(key);
          res.setHeader('Retry-After', Math.max(1, Math.ceil(ttlMs / 1000)));
          next(new AppError(429, 'Trop de tentatives, veuillez réessayer plus tard'));
          return;
        }

        next();
        return;
      }

      const now = Date.now();
      const existing = buckets.get(key);

      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        next();
        return;
      }

      if (existing.count >= options.max) {
        res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000));
        next(new AppError(429, 'Trop de tentatives, veuillez réessayer plus tard'));
        return;
      }

      existing.count += 1;
      next();
    })().catch(next);
  };
}
