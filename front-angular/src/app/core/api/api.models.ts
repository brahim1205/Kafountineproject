export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  counts?: Record<string, number>;
  somme?: number;
  montantPaye?: number;
  nombrePaye?: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PageMeta;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

/** Erreur renvoyée par l'API : son message, rédigé par le serveur, est montré tel quel à l'utilisateur. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;
