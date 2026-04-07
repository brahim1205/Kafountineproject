jest.mock('../dist/src/shared/infrastructure/redis/getRedisClient', () => ({
  getRedisClient: jest.fn(),
}));

describe('RedisAuthSessionStore fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('stores, reads, and deletes sessions in memory when Redis is unavailable', async () => {
    const { getRedisClient } = require('../dist/src/shared/infrastructure/redis/getRedisClient');
    getRedisClient.mockResolvedValue(null);

    const { RedisAuthSessionStore } = require('../dist/src/modules/auth/infrastructure/RedisAuthSessionStore');

    const store = new RedisAuthSessionStore();
    await store.save('user-1', 'session-1', 'refresh-token', 60);

    await expect(store.find('user-1', 'session-1')).resolves.toBe('refresh-token');

    await store.delete('user-1', 'session-1');
    await expect(store.find('user-1', 'session-1')).resolves.toBeNull();
  });
});
