import type { NextFunction, Response } from 'express';
import { JwtTokenService } from '../../security/JwtTokenService';
import type { AuthRequest } from '../../types/AuthRequest';
import { UnauthorizedError } from '../../errors/AppError';
import { AUTH_TOKEN_COOKIE, readCookie } from '../../http/cookies';

export function buildAuthenticate(tokenService: JwtTokenService) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const authorization = req.header('authorization');
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const cookieToken = readCookie(req, AUTH_TOKEN_COOKIE);
    const token = bearerToken || cookieToken;

    if (!token) {
      next(new UnauthorizedError('Token requis'));
      return;
    }

    const payload = tokenService.verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      role: payload.role,
      tokenType: 'access',
    };
    next();
  };
}
