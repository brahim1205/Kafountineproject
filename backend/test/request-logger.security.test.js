describe('requestLogger security', () => {
  it('logs Express req.ip instead of raw X-Forwarded-For', () => {
    const { requestLogger } = require('../dist/src/shared/presentation/middleware/requestLogger');
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const finishListeners = {};
    const req = {
      ip: '10.0.0.10',
      method: 'GET',
      originalUrl: '/api/v1/users?token=secret',
      header: (name) => {
        if (name.toLowerCase() === 'x-request-id') return 'req-1';
        if (name.toLowerCase() === 'x-forwarded-for') return '203.0.113.1';
        return undefined;
      },
    };
    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      on: (event, listener) => {
        finishListeners[event] = listener;
      },
    };

    requestLogger(req, res, jest.fn());
    finishListeners.finish();

    const payload = JSON.parse(writeSpy.mock.calls[0][0]);
    expect(payload.ip).toBe('10.0.0.10');
    expect(payload.path).toBe('/api/v1/users?token=%5BREDACTED%5D');

    writeSpy.mockRestore();
  });
});
