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
  dbPoolSize: Number(process.env.DB_POOL_SIZE || 10),
  dbPoolMin: Number(process.env.DB_POOL_MIN || 2),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  apiRateLimitWindowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
  apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX || 300),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 900_000),
  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  maxUploadFileSizeBytes: Number(process.env.MAX_UPLOAD_FILE_SIZE_BYTES || 5 * 1024 * 1024),
  trustProxy: (process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? 'loopback, linklocal, uniquelocal' : 'false')).trim(),
  cookieDomain: (process.env.COOKIE_DOMAIN || '').trim(),
  cookieSameSite: (process.env.COOKIE_SAME_SITE || 'lax').trim().toLowerCase(),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL || '',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:5173',
  portalOtpTtlSeconds: Number(process.env.PORTAL_OTP_TTL_SECONDS || 600),
  portalOtpDeliveryMode: (process.env.PORTAL_OTP_DELIVERY_MODE || 'dev').trim().toLowerCase(),
  portalOtpWebhookUrl: (process.env.PORTAL_OTP_WEBHOOK_URL || '').trim(),
  portalOtpWebhookToken: (process.env.PORTAL_OTP_WEBHOOK_TOKEN || '').trim(),
  metricsBearerToken: (process.env.METRICS_BEARER_TOKEN || '').trim(),
  enableApiDocs: process.env.ENABLE_API_DOCS === 'true' || process.env.NODE_ENV !== 'production',
  enableMetrics: process.env.ENABLE_METRICS === 'true' || process.env.NODE_ENV !== 'production',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
  otelEnabled: process.env.OTEL_ENABLED === 'true',
  otelServiceName: process.env.OTEL_SERVICE_NAME || 'kafountine-backend',
  otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '',
};

function validateProductionEnv(config: typeof env) {
  if (!config.isProduction) {
    return;
  }

  if (config.jwtSecret.length < 32 || config.jwtRefreshSecret.length < 32) {
    throw new Error('JWT_SECRET et JWT_REFRESH_SECRET doivent contenir au moins 32 caractères en production.');
  }

  if (config.jwtSecret === config.jwtRefreshSecret) {
    throw new Error('JWT_SECRET et JWT_REFRESH_SECRET doivent être différents en production.');
  }

  if (!['lax', 'strict', 'none'].includes(config.cookieSameSite)) {
    throw new Error('COOKIE_SAME_SITE doit valoir lax, strict ou none.');
  }

  if (config.corsOrigin.length === 0 || config.corsOrigin.includes('*')) {
    throw new Error('CORS_ORIGIN doit lister des origines explicites en production.');
  }

  if (!isAllowedTrustProxyValue(config.trustProxy)) {
    throw new Error('TRUST_PROXY doit valoir false, loopback/linklocal/uniquelocal ou une liste IP/CIDR explicite en production.');
  }

  if (!config.portalUrl.startsWith('https://')) {
    throw new Error('PORTAL_URL doit utiliser HTTPS en production.');
  }

  if (config.portalOtpDeliveryMode !== 'webhook' || !config.portalOtpWebhookUrl.startsWith('https://')) {
    throw new Error('PORTAL_OTP_DELIVERY_MODE=webhook et PORTAL_OTP_WEBHOOK_URL HTTPS sont requis en production.');
  }

  if (!config.portalOtpWebhookToken) {
    throw new Error('PORTAL_OTP_WEBHOOK_TOKEN est requis en production.');
  }

  if (config.enableApiDocs) {
    throw new Error('ENABLE_API_DOCS doit être désactivé en production.');
  }

  if (config.enableMetrics && config.metricsBearerToken.length < 32) {
    throw new Error('METRICS_BEARER_TOKEN doit contenir au moins 32 caractères quand ENABLE_METRICS=true en production.');
  }
}

validateProductionEnv(env);

function isAllowedTrustProxyValue(value: string) {
  if (value === 'false') {
    return true;
  }

  if (value === 'true' || /^\d+$/.test(value)) {
    return false;
  }

  const allowedNames = new Set(['loopback', 'linklocal', 'uniquelocal']);
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .every((entry) => allowedNames.has(entry) || /^[0-9a-fA-F:.]+(?:\/\d{1,3})?$/.test(entry));
}
