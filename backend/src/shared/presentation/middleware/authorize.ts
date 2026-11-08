import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../../types/AuthRequest';
import { UnauthorizedError, ForbiddenError } from '../../errors/AppError';

export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'AGENT' | 'SERVICE_FINANCES' | 'QUAI_PECHE' | 'ETAT_CIVIL' | 'REGISSEUR';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SERVICE_FINANCES: 3,
  QUAI_PECHE: 2,
  ETAT_CIVIL: 2,
  REGISSEUR: 2,
  AGENT: 1,
};

/** Interdit un module à certains rôles, sur des routes ouvertes à tout compte connecté. */
export function denyRoles(...deniedRoles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (req.user && deniedRoles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError('Permissions insuffisantes pour cette action'));
    }
    next();
  };
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise'));
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError('Permissions insuffisantes pour cette action'));
    }

    next();
  };
}

export function authorizeMinLevel(minLevel: UserRole) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise'));
    }

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minLevel] ?? 0;

    if (userLevel < requiredLevel) {
      return next(new ForbiddenError('Permissions insuffisantes pour cette action'));
    }

    next();
  };
}
