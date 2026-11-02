import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError';
import type { AuthRequest } from '../../types/AuthRequest';
import { env } from '../../config/env';
import { redactUrl } from '../../logging/redaction';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;
  const req = _req as AuthRequest;
  const requestId = req.requestId || req.header('x-request-id') || 'unknown';

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
      requestId,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ success: false, message: 'Ressource introuvable', requestId });
    return;
  }

  process.stderr.write(`${JSON.stringify({
    type: 'error',
    requestId,
    method: req.method,
    path: redactUrl(req.originalUrl),
    userId: req.user?.userId ?? null,
    role: req.user?.role ?? null,
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : 'Erreur inconnue',
    stack: !env.isProduction && error instanceof Error ? error.stack : undefined,
  })}\n`);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur', requestId });
}
