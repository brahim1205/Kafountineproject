import type { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const forwardedFor = req.header('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';

    console.info(JSON.stringify({
      type: 'access',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip,
    }));
  });

  next();
}
