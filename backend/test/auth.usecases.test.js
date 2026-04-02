describe('Auth use cases', () => {
  it('creates a stateful session on login', async () => {
    const bcrypt = require('bcryptjs');
    const { LoginUseCase } = require('../dist/src/modules/auth/application/LoginUseCase');

    const passwordHash = await bcrypt.hash('password123', 4);
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'admin@test.com',
        password: passwordHash,
        nom: 'Admin',
        prenom: 'Test',
        role: 'ADMIN',
        isActive: true,
      }),
    };
    const tokenService = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
      signRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      getRefreshTokenExpiresIn: jest.fn().mockReturnValue('7d'),
    };
    const authSessionStore = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new LoginUseCase(userRepository, tokenService, authSessionStore);
    const result = await useCase.execute({ email: 'admin@test.com', password: 'password123' });

    expect(tokenService.signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      role: 'ADMIN',
      sessionId: expect.any(String),
    }));
    expect(tokenService.signRefreshToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      sessionId: expect.any(String),
    }));
    expect(authSessionStore.save).toHaveBeenCalledWith('user-1', expect.any(String), 'refresh-token', 604800);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rotates refresh tokens only when the stored session matches', async () => {
    const { RefreshTokenUseCase } = require('../dist/src/modules/auth/application/RefreshTokenUseCase');

    const userRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
        isActive: true,
      }),
    };
    const tokenService = {
      verifyRefreshToken: jest.fn().mockReturnValue({
        userId: 'user-1',
        sessionId: 'session-1',
        type: 'refresh',
      }),
      signAccessToken: jest.fn().mockReturnValue('new-access-token'),
      signRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
      getRefreshTokenExpiresIn: jest.fn().mockReturnValue('7d'),
    };
    const authSessionStore = {
      find: jest.fn().mockResolvedValue('old-refresh-token'),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new RefreshTokenUseCase(userRepository, tokenService, authSessionStore);
    const result = await useCase.execute('old-refresh-token');

    expect(authSessionStore.find).toHaveBeenCalledWith('user-1', 'session-1');
    expect(authSessionStore.save).toHaveBeenCalledWith('user-1', 'session-1', 'new-refresh-token', 604800);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });

  it('revokes a stored session on logout', async () => {
    const { LogoutUseCase } = require('../dist/src/modules/auth/application/LogoutUseCase');

    const authSessionStore = {
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new LogoutUseCase(authSessionStore);
    await useCase.execute('user-1', 'session-1');

    expect(authSessionStore.delete).toHaveBeenCalledWith('user-1', 'session-1');
  });
});
