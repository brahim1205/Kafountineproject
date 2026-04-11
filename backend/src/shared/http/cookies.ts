import type { Request, Response, CookieOptions } from 'express';
import { parse as parseCookieHeader } from 'cookie';
import { env } from '../config/env';

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const PORTAL_TOKEN_COOKIE = 'portal_token';

function getCookieDomain(): string | undefined {
  return env.cookieDomain || undefined;
}

function buildCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
    domain: getCookieDomain(),
  };
}

function parseExpiresInToMs(value: string, fallbackMs: number) {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit];
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(AUTH_TOKEN_COOKIE, accessToken, buildCookieOptions(parseExpiresInToMs(env.jwtExpiresIn, 15 * 60 * 1000)));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, buildCookieOptions(parseExpiresInToMs(env.jwtRefreshExpiresIn, 7 * 24 * 60 * 60 * 1000)));
}

export function clearAuthCookies(res: Response) {
  const options = {
    path: '/',
    domain: getCookieDomain(),
    secure: env.isProduction,
    sameSite: 'lax' as const,
  };
  res.clearCookie(AUTH_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

export function setPortalCookie(res: Response, portalToken: string) {
  res.cookie(PORTAL_TOKEN_COOKIE, portalToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));
}

export function clearPortalCookie(res: Response) {
  res.clearCookie(PORTAL_TOKEN_COOKIE, {
    path: '/',
    domain: getCookieDomain(),
    secure: env.isProduction,
    sameSite: 'lax',
  });
}

export function readCookie(req: Pick<Request, 'headers'>, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }

  const cookies = parseCookieHeader(header);
  return cookies[name] || null;
}
