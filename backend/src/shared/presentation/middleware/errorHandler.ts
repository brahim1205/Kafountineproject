import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ success: false, message: 'Ressource introuvable' });
    return;
  }

  process.stderr.write(`${JSON.stringify({
    type: 'error',
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : 'Erreur inconnue',
  })}\n`);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
}
