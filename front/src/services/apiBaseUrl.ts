const API_PATH_PREFIX = '/api/v1';
const LOCAL_API_PORT = '3000';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function buildLocalApiUrl(): string {
  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || '127.0.0.1';
  return `${protocol}//${hostname}:${LOCAL_API_PORT}${API_PATH_PREFIX}`;
}

export function resolveApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  const isDevelopment = import.meta.env.DEV;

  if (configuredUrl) {
    const normalizedUrl = trimTrailingSlashes(configuredUrl);

    // In Vite dev, keep relative API paths so the dev proxy can route requests.
    if (isDevelopment && normalizedUrl.startsWith('/')) {
      return normalizedUrl;
    }

    // Browsers cannot reach localhost in production deployments; use same-origin proxy there.
    if (!isDevelopment && /^(https?:)?\/\/localhost(?::\d+)?(\/|$)/i.test(normalizedUrl)) {
      return API_PATH_PREFIX;
    }

    if (
      normalizedUrl === API_PATH_PREFIX &&
      typeof window !== 'undefined' &&
      isLocalHost(window.location.hostname) &&
      window.location.port !== LOCAL_API_PORT
    ) {
      return buildLocalApiUrl();
    }

    return normalizedUrl;
  }

  if (isDevelopment) {
    return API_PATH_PREFIX;
  }

  if (
    typeof window !== 'undefined' &&
    isLocalHost(window.location.hostname) &&
    window.location.port !== LOCAL_API_PORT
  ) {
    return buildLocalApiUrl();
  }

  return API_PATH_PREFIX;
}
