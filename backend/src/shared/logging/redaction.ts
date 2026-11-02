const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'code',
  'otp',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'portalToken',
  'jwt',
  'secret',
  'apiKey',
  'apikey',
  'key',
  'signature',
  'tx_id',
]);

function isSensitiveKey(key: string) {
  const normalized = key.trim().toLowerCase();
  return (
    SENSITIVE_KEYS.has(key) ||
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('signature')
  );
}

export function redactUrl(value: string | undefined) {
  if (!value) {
    return value || '';
  }

  try {
    const url = new URL(value, 'http://local');
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.replace(/([?&][^=]*(token|secret|password|signature|code|otp|tx_id)[^=]*=)[^&]*/gi, '$1[REDACTED]');
  }
}

export function redactHeader(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.replace(/(bearer|basic)\s+[^\s,;]+/gi, '$1 [REDACTED]');
}
