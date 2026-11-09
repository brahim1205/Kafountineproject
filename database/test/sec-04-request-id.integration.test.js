// SEC-04 : un identifiant de requête fourni par le client est borné avant d'être renvoyé et journalisé.
const { describeIntegration, anonymous } = require('./helpers/session');

describeIntegration('SEC-04 identifiant de requête', () => {
  it('remplace une valeur trop longue ou invalide', async () => {
    for (const value of ['A'.repeat(4000), '<script>alert(1)</script>']) {
      const res = await anonymous().get('/health').set('x-request-id', value);
      expect(res.headers['x-request-id']).not.toBe(value);
      expect(res.headers['x-request-id'].length).toBeLessThanOrEqual(128);
    }
  });

  it('conserve un identifiant valide', async () => {
    const res = await anonymous().get('/health').set('x-request-id', 'trace-123_abc');
    expect(res.headers['x-request-id']).toBe('trace-123_abc');
  });
});
