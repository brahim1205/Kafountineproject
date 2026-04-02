import type { Request, Response, CookieOptions } from 'express';
import { parse as parseCookieHeader } from 'cookie';
import { env } from '../config/env';

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const PORTAL_TOKEN_COOKIE = 'portal_token';

function buildCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(AUTH_TOKEN_COOKIE, accessToken, buildCookieOptions(24 * 60 * 60 * 1000));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(AUTH_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}

export function setPortalCookie(res: Response, portalToken: string) {
  res.cookie(PORTAL_TOKEN_COOKIE, portalToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));
}

export function clearPortalCookie(res: Response) {
  res.clearCookie(PORTAL_TOKEN_COOKIE, { path: '/' });
}

export function readCookie(req: Pick<Request, 'headers'>, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }

  const cookies = parseCookieHeader(header);
  return cookies[name] || null;
}
