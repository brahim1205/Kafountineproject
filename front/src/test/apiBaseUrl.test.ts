import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrlFromEnv } from '../services/apiBaseUrl';

describe('resolveApiBaseUrlFromEnv', () => {
  it('defaults to same-origin API path', () => {
    expect(resolveApiBaseUrlFromEnv(undefined, false)).toBe('/api/v1');
  });

  it('keeps same-origin API path in production', () => {
    expect(resolveApiBaseUrlFromEnv('/api/v1/', false)).toBe('/api/v1');
  });

  it('rewrites production localhost API URLs to same-origin path', () => {
    expect(resolveApiBaseUrlFromEnv('http://localhost:3000/api/v1', false)).toBe('/api/v1');
  });

  it('allows explicit non-local API origins when an operator intentionally configures one', () => {
    expect(resolveApiBaseUrlFromEnv('https://api.example.com/api/v1/', false)).toBe('https://api.example.com/api/v1');
  });
});
