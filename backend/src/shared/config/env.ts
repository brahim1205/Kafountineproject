import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  apiRateLimitWindowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX || 300),
  maxUploadFileSizeBytes: Number(process.env.MAX_UPLOAD_FILE_SIZE_BYTES || 5 * 1024 * 1024),
  cookieDomain: (process.env.COOKIE_DOMAIN || '').trim(),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL || '',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:5173',
  enableApiDocs: process.env.ENABLE_API_DOCS === 'true' || process.env.NODE_ENV !== 'production',
  enableMetrics: process.env.ENABLE_METRICS === 'true' || process.env.NODE_ENV !== 'production',
};
