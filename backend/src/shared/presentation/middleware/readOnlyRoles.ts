import type { Request } from 'express';

/** Rôles en consultation seule : ils voient tout ce que leur rôle permet de voir, sans rien modifier. */
export const READ_ONLY_ROLES = new Set(['ADMIN']);

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Écritures permises même en consultation seule : elles ne modifient aucune donnée de la commune
 * (son propre mot de passe, la déconnexion, l'état « lu » de ses notifications, la production d'un PDF
 * ou d'un export).
 */
const ALLOWED_WRITES: RegExp[] = [
  /^\/auth\/(logout|change-password)$/,
  /^\/notifications\/(read-all|[^/]+\/read)$/,
  /^\/exports\/(report|receipt)\.pdf$/,
  /^\/audit\/export$/,
];

/** Chemin de la requête sans le préfixe d'API (/api/v1) ni les paramètres. */
function apiPath(req: Request) {
  const full = `${req.baseUrl || ''}${req.path || ''}`;
  return full.replace(/^\/api\/v\d+/, '') || '/';
}

export function isWriteForbiddenForRole(role: string | undefined, req: Request) {
  if (!role || !READ_ONLY_ROLES.has(role.toUpperCase())) return false;
  if (READ_METHODS.has(req.method.toUpperCase())) return false;
  const path = apiPath(req);
  return !ALLOWED_WRITES.some((pattern) => pattern.test(path));
}
