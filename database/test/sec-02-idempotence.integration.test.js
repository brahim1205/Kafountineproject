// SEC-02 : une réponse mémorisée n'est rejouée qu'au compte qui l'a obtenue.
const { describeIntegration, login, anonymous, origin, password } = require('./helpers/session');

describeIntegration('SEC-02 idempotence par compte', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const year = new Date().getFullYear();
  const place = (numero) => ({ numeroPlace: numero, type: 'Étal', zone: 'Zone A', tarif: 5000, year });
  let agent;
  let regisseur;

  beforeAll(async () => {
    agent = await login('agent@kafountine.gouv.sn');
    regisseur = await login('regisseur@kafountine.gouv.sn');
  });

  it('ne rejoue pas la réponse à une requête sans session', async () => {
    const key = `sec02-anon-${suffix}`;
    const first = await agent.post('/marche/places').set('idempotency-key', key).send(place(`S2A-${suffix}`));
    expect(first.status).toBe(201);
    const replay = await anonymous().post('/api/v1/marche/places').set('Origin', origin).set('idempotency-key', key).send({});
    expect(replay.status).toBe(401);
  });

  it('ne rejoue pas la réponse d’un autre compte', async () => {
    const key = `sec02-user-${suffix}`;
    const first = await agent.post('/marche/places').set('idempotency-key', key).send(place(`S2B-${suffix}`));
    const second = await regisseur.post('/marche/places').set('idempotency-key', key).send(place(`S2C-${suffix}`));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).not.toBe(first.body.data.id);
  });

  it('rejoue la réponse au même compte', async () => {
    const key = `sec02-same-${suffix}`;
    const first = await agent.post('/marche/places').set('idempotency-key', key).send(place(`S2D-${suffix}`));
    const again = await agent.post('/marche/places').set('idempotency-key', key).send(place(`S2D-${suffix}`));
    expect(again.status).toBe(first.status);
    expect(again.body.data.id).toBe(first.body.data.id);
  });

  it('vérifie toujours le mot de passe à la connexion', async () => {
    const key = `sec02-login-${suffix}`;
    const send = (pwd) => anonymous().post('/api/v1/auth/login').set('Origin', origin).set('idempotency-key', key)
      .send({ email: 'finances@kafountine.gouv.sn', password: pwd });
    expect((await send(password)).status).toBe(200);
    expect((await send('MauvaisMotDePasse1!')).status).toBe(401);
  });
});
