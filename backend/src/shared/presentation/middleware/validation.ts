import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../errors/AppError';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: z.ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = target === 'body' ? req.body : target === 'query' ? req.query : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ValidationError('Données invalides', details));
    }

    if (target === 'body') {
      req.body = result.data;
    } else if (target === 'query') {
      req.query = result.data as Request['query'];
    } else {
      req.params = result.data as Request['params'];
    }

    next();
  };
}
