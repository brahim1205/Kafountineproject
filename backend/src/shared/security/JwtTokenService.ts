import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

export type AccessTokenPayload = {
  userId: string;
  sessionId: string;
  role: string;
  type: 'access';
};

export type PortalTokenPayload = {
  id: string;
  role: 'CONTRIBUABLE';
  type: 'portal';
};

export type RefreshTokenPayload = {
  userId: string;
  sessionId: string;
  type: 'refresh';
};

export class JwtTokenService {
  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>) {
    return jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>) {
    return jwt.sign({ ...payload, type: 'refresh' }, env.jwtRefreshSecret, {
      expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  signPortalToken(payload: Omit<PortalTokenPayload, 'type'>) {
    return jwt.sign({ ...payload, type: 'portal' }, env.jwtSecret, {
      expiresIn: '7d',
    });
  }

  verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError('Token invalide');
    }
  }

  verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedError('Refresh token invalide');
    }
  }

  verifyPortalToken(token: string) {
    try {
      return jwt.verify(token, env.jwtSecret) as PortalTokenPayload;
    } catch {
      throw new UnauthorizedError('Token portail invalide');
    }
  }

  getRefreshTokenExpiresIn() {
    return env.jwtRefreshExpiresIn;
  }
}
