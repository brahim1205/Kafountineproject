import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { ForbiddenError } from '../../errors/AppError';
import { AUTH_TOKEN_COOKIE, PORTAL_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, readCookie } from '../../http/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

const allowedOrigins = new Set(
  [...env.corsOrigin, env.portalUrl]
    .filter(Boolean)
    .map((value) => normalizeOrigin(value))
);

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const bearerToken = req.header('authorization');
  if (bearerToken?.startsWith('Bearer ')) {
    next();
    return;
  }

  const hasSessionCookie = Boolean(
    readCookie(req, AUTH_TOKEN_COOKIE) ||
    readCookie(req, REFRESH_TOKEN_COOKIE) ||
    readCookie(req, PORTAL_TOKEN_COOKIE)
  );

  if (!hasSessionCookie) {
    next();
    return;
  }

  const originHeader = req.header('origin');
  const refererHeader = req.header('referer');
  const requestOrigin = originHeader
    ? normalizeOrigin(originHeader)
    : refererHeader
      ? normalizeOrigin(refererHeader)
      : null;

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    next(new ForbiddenError('Origine de requête non autorisée'));
    return;
  }

  next();
}
