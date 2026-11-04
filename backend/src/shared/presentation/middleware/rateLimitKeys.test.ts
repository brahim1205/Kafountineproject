import type { Request } from 'express';
import { AUTH_TOKEN_COOKIE } from '../../http/cookies';
import { JwtTokenService } from '../../security/JwtTokenService';
import { loginAttemptKey, userOrIpKey } from './rateLimitKeys';

const request = (headers: Record<string, string> = {}, body: unknown = {}) =>
  ({ ip: '203.0.113.7', body, headers, header: (name: string) => headers[name.toLowerCase()] }) as unknown as Request;

describe('clés de limitation de débit', () => {
  it('compte un utilisateur connecté à part, même derrière une IP partagée', () => {
    const token = new JwtTokenService().signAccessToken({ userId: 'user-1', sessionId: 'session-1', role: 'AGENT' });

    expect(userOrIpKey(request({ authorization: `Bearer ${token}` }))).toBe('user:user-1');
    expect(userOrIpKey(request({ cookie: `${AUTH_TOKEN_COOKIE}=${token}` }))).toBe('user:user-1');
  });

  it('retombe sur l’IP pour un visiteur anonyme ou un jeton invalide', () => {
    expect(userOrIpKey(request())).toBe('ip:203.0.113.7');
    expect(userOrIpKey(request({ authorization: 'Bearer faux-jeton' }))).toBe('ip:203.0.113.7');
  });

  it('distingue les tentatives de connexion par compte, sans tenir compte de la casse', () => {
    expect(loginAttemptKey(request({}, { email: ' Agent@Kafountine.gouv.sn ' }))).toBe('203.0.113.7:agent@kafountine.gouv.sn');
    expect(loginAttemptKey(request({}, { email: 'autre@kafountine.gouv.sn' }))).not.toBe(loginAttemptKey(request({}, { email: 'agent@kafountine.gouv.sn' })));
  });
});
