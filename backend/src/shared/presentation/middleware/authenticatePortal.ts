import type { NextFunction, Response } from 'express';
import { JwtTokenService } from '../../security/JwtTokenService';
import type { AuthRequest } from '../../types/AuthRequest';
import { UnauthorizedError } from '../../errors/AppError';
import { PORTAL_TOKEN_COOKIE, readCookie } from '../../http/cookies';

export function buildAuthenticatePortal(tokenService: JwtTokenService) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const authorization = req.header('authorization');
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const cookieToken = readCookie(req, PORTAL_TOKEN_COOKIE);
    const token = bearerToken || cookieToken;

    if (!token) {
      next(new UnauthorizedError('Token requis'));
      return;
    }

    const payload = tokenService.verifyPortalToken(token);
    req.user = {
      userId: payload.id,
      role: payload.role,
      tokenType: 'portal',
    };
    next();
  };
}
