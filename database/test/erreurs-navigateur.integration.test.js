// Les erreurs survenues dans le navigateur sont transmises au backend, qui les écrit dans ses logs.
const { describeIntegration, login, anonymous, origin } = require('./helpers/session');

describeIntegration('rapports d\'erreurs du navigateur', () => {
  it('accepte le rapport d\'un utilisateur connecté', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const res = await agent.post('/client-errors').send({ message: 'TypeError: x est undefined', stack: 'at page (main.js:1:1)', page: '/marche' });
    expect(res.status).toBe(200);
  });

  it('refuse un rapport anonyme ou vide', async () => {
    expect((await anonymous().post('/api/v1/client-errors').set('Origin', origin).send({ message: 'spam' })).status).toBe(401);
    const agent = await login('agent@kafountine.gouv.sn');
    expect((await agent.post('/client-errors').send({ message: '' })).status).toBe(400);
    expect((await agent.post('/client-errors').send({ message: 'x', stack: 'a'.repeat(9000) })).status).toBe(400);
  });
});
