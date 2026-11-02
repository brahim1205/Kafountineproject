const API_PATH_PREFIX = '/api/v1';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveApiBaseUrlFromEnv(configuredUrl: string | undefined, isDevelopment: boolean): string {
  if (configuredUrl) {
    const normalizedUrl = trimTrailingSlashes(configuredUrl.trim());

    // In Vite dev, keep relative API paths so the dev proxy can route requests.
    if (isDevelopment && normalizedUrl.startsWith('/')) {
      return normalizedUrl;
    }

    // Browsers cannot reach localhost in production deployments; use same-origin proxy there.
    if (!isDevelopment && /^(https?:)?\/\/localhost(?::\d+)?(\/|$)/i.test(normalizedUrl)) {
      return API_PATH_PREFIX;
    }

    return normalizedUrl;
  }

  // No VITE_API_URL configured: always use relative path so the Vite proxy handles it in dev
  // and the same-origin nginx proxy handles it in production.
  return API_PATH_PREFIX;
}

export function resolveApiBaseUrl(): string {
  return resolveApiBaseUrlFromEnv(import.meta.env.VITE_API_URL, import.meta.env.DEV);
}
