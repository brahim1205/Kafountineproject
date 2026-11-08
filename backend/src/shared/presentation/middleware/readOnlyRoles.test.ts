import type { Request } from 'express';
import { isWriteForbiddenForRole } from './readOnlyRoles';

const req = (method: string, baseUrl: string, path: string) => ({ method, baseUrl, path }) as unknown as Request;

describe('isWriteForbiddenForRole', () => {
  it('interdit toute écriture au rôle ADMIN', () => {
    expect(isWriteForbiddenForRole('ADMIN', req('POST', '/api/v1/transactions', '/'))).toBe(true);
    expect(isWriteForbiddenForRole('ADMIN', req('PUT', '/api/v1/budget', '/demandes/abc'))).toBe(true);
    expect(isWriteForbiddenForRole('ADMIN', req('DELETE', '/api/v1/contribuables', '/abc'))).toBe(true);
    expect(isWriteForbiddenForRole('ADMIN', req('POST', '/api/v1', '/users'))).toBe(true);
  });

  it('laisse lire, et permet les écritures qui ne touchent aucune donnée', () => {
    expect(isWriteForbiddenForRole('ADMIN', req('GET', '/api/v1/transactions', '/'))).toBe(false);
    expect(isWriteForbiddenForRole('ADMIN', req('POST', '/api/v1/auth', '/change-password'))).toBe(false);
    expect(isWriteForbiddenForRole('ADMIN', req('POST', '/api/v1/auth', '/logout'))).toBe(false);
    expect(isWriteForbiddenForRole('ADMIN', req('PATCH', '/api/v1', '/notifications/abc/read'))).toBe(false);
    expect(isWriteForbiddenForRole('ADMIN', req('POST', '/api/v1', '/exports/report.pdf'))).toBe(false);
  });

  it('ne change rien pour les autres rôles', () => {
    for (const role of ['SUPER_ADMIN', 'AGENT', 'SERVICE_FINANCES', 'QUAI_PECHE']) {
      expect(isWriteForbiddenForRole(role, req('POST', '/api/v1/transactions', '/'))).toBe(false);
    }
  });
});
