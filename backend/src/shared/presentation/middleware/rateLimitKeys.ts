import type { Request } from 'express';
import { AUTH_TOKEN_COOKIE, readCookie } from '../../http/cookies';
import { JwtTokenService } from '../../security/JwtTokenService';
import { getClientIp } from './rateLimit';

const tokenService = new JwtTokenService();

/**
 * Compteur par utilisateur connecté (jeton vérifié), sinon par IP.
 * Les agents d'une même mairie sortent souvent par une seule IP : un compteur par IP les bloquerait ensemble.
 */
export function userOrIpKey(req: Request) {
  const authorization = req.header('authorization');
  const token = (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null) || readCookie(req, AUTH_TOKEN_COOKIE);
  if (token) {
    try {
      return `user:${tokenService.verifyAccessToken(token).userId}`;
    } catch {
      // Jeton invalide ou expiré : compté comme un visiteur anonyme.
    }
  }
  return `ip:${getClientIp(req)}`;
}

/** Compteur par compte visé et par IP : freine le forçage d'un mot de passe sans bloquer les collègues. */
export function loginAttemptKey(req: Request) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${getClientIp(req)}:${email}`;
}
