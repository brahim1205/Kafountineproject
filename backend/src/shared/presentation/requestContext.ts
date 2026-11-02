import type { Request } from 'express';
import type { Actor } from '../audit/AuditTrail';
import type { AuthRequest } from '../types/AuthRequest';

export function actorFrom(req: Request): Actor {
  const { user } = req as AuthRequest;
  return {
    userId: user?.userId || null,
    role: user?.role || null,
    ipAddress: req.ip || null,
  };
}

export function yearFrom(source: unknown) {
  const value = (source as { year?: unknown } | undefined)?.year;
  return value ? Number(value) : new Date().getFullYear();
}
