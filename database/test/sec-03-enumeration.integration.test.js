// SEC-03 : le temps de réponse à la connexion ne révèle pas si un compte existe.
const { describeIntegration, anonymous, origin } = require('./helpers/session');

describeIntegration('SEC-03 énumération des comptes', () => {
  const attempt = async (email) => {
    const start = performance.now();
    const res = await anonymous().post('/api/v1/auth/login').set('Origin', origin).send({ email, password: 'MauvaisMotDePasse1!' });
    expect(res.status).toBe(401);
    return performance.now() - start;
  };

  it('traite un compte inconnu aussi lentement qu’un compte existant', async () => {
    const known = await attempt('etatcivil@kafountine.gouv.sn');
    const unknown = await attempt(`inconnu${Date.now()}@kafountine.gouv.sn`);
    // bcrypt domine : sans vérification sur le compte inconnu, le rapport dépasse largement 5.
    expect(known / unknown).toBeLessThan(3);
  });
});
