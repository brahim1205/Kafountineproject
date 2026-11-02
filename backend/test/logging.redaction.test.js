describe('logging redaction', () => {
  it('redacts sensitive query parameters from logged URLs', () => {
    const { redactUrl } = require('../dist/src/shared/logging/redaction');

    expect(redactUrl('/callback?tx_id=PAY-123&status=success&token=abc')).toBe('/callback?tx_id=%5BREDACTED%5D&status=success&token=%5BREDACTED%5D');
    expect(redactUrl('https://app.example.com/reset?signature=sig&email=user@example.com')).toBe('/reset?signature=%5BREDACTED%5D&email=user%40example.com');
  });

  it('redacts bearer/basic credentials from logged headers', () => {
    const { redactHeader } = require('../dist/src/shared/logging/redaction');

    expect(redactHeader('Bearer abc.def.ghi')).toBe('Bearer [REDACTED]');
    expect(redactHeader('Basic dXNlcjpwYXNz')).toBe('Basic [REDACTED]');
  });
});
