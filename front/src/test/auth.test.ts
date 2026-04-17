import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginRequest, saveSession, logoutRequest } from '../services/auth';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('loginRequest', () => {
    it('should return user and token on successful login', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@test.com', nom: 'Test', prenom: 'User', role: 'ADMIN' },
          token: 'test-jwt-token',
          accessToken: 'test-jwt-token',
          refreshToken: 'test-refresh-token',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loginRequest({ email: 'test@test.com', password: 'password123' });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw error on failed login', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, message: 'Invalid credentials' }),
      });

      await expect(loginRequest({ email: 'test@test.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('saveSession', () => {
    it('should save session data to localStorage', () => {
      const session = {
        user: { id: '1', email: 'test@test.com', nom: 'Test', prenom: 'User', role: 'ADMIN' },
        token: 'test-token',
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      };

      saveSession(session);

    expect(sessionStorage.getItem('isAuthenticated')).toBe('true');
    expect(sessionStorage.getItem('userRole')).toBe('admin');
    });
  });

  describe('logoutRequest', () => {
    it('should call logout endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await logoutRequest('test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });
});
