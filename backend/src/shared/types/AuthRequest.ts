import type { Request } from 'express';

export type AuthenticatedUser = {
  userId: string;
  sessionId?: string;
  role: string;
  tokenType?: 'access' | 'portal';
};

export type AuthRequest = Request & {
  user?: AuthenticatedUser;
};
