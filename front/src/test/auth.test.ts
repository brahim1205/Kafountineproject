import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginRequest, saveSession, logoutRequest } from '../services/auth';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('loginRequest', () => {
    it('should return user on successful login', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@test.com', nom: 'Test', prenom: 'User', role: 'ADMIN' },
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loginRequest({ email: 'test@test.com', password: 'password123' });

      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw error on failed login', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, message: 'Invalid credentials' }),
      });

      await expect(loginRequest({ email: 'test@test.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('should report an unreachable server in French on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(loginRequest({ email: 'test@test.com', password: 'password123' }))
        .rejects.toThrow('Impossible de contacter le serveur de connexion');
    });
  });

  describe('saveSession', () => {
    it('should save session data to sessionStorage', () => {
      const session = {
        user: { id: '1', email: 'test@test.com', nom: 'Test', prenom: 'User', role: 'ADMIN' },
      };

      saveSession(session);

    expect(sessionStorage.getItem('isAuthenticated')).toBe('true');
    expect(sessionStorage.getItem('userRole')).toBe('admin');
    });
  });

  describe('logoutRequest', () => {
    it('should call logout endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      await logoutRequest('test-token');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });
});
