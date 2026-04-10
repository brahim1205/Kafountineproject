import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../types/AuthRequest';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  const startedAt = Date.now();
  const requestId = req.header('x-request-id') || randomUUID();

  authReq.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const forwardedFor = req.header('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';
    const referer = req.header('referer');
    const userAgent = req.header('user-agent');

    process.stdout.write(`${JSON.stringify({
      type: 'access',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip,
      userId: authReq.user?.userId ?? null,
      role: authReq.user?.role ?? null,
      referer: referer || null,
      userAgent: userAgent || null,
    })}\n`);
  });

  next();
}
