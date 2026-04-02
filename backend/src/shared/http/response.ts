import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function okWithMeta<T>(res: Response, data: T, meta: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, data, meta });
}

export function message(res: Response, text: string, status = 200) {
  return res.status(status).json({ success: true, message: text });
}
