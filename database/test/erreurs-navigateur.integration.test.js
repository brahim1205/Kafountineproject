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

describeIntegration('suivi des incidents par le super admin', () => {
  it('regroupe les erreurs, se traite et se rouvre si elle se reproduit', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const superadmin = await login('superadmin@kafountine.gouv.sn');
    const message = `TypeError: incident-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      expect((await agent.post('/client-errors').send({ message, page: '/recettes' })).status).toBe(200);
    }

    const liste = await superadmin.get(`/incidents?search=${encodeURIComponent(message)}`);
    expect(liste.status).toBe(200);
    expect(liste.body.data.incidents).toHaveLength(1);
    const incident = liste.body.data.incidents[0];
    expect(incident).toMatchObject({ source: 'navigateur', lieu: '/recettes', message, occurrences: 2, statut: 'nouveau', role: 'AGENT' });

    const traite = await superadmin.patch(`/incidents/${incident.id}`).send({ statut: 'traite', note: 'Corrigé' });
    expect(traite.status).toBe(200);
    expect(traite.body.data).toMatchObject({ statut: 'traite', note: 'Corrigé' });
    expect(traite.body.data.traitePar).toBeTruthy();

    await agent.post('/client-errors').send({ message, page: '/recettes' });
    const rouvert = (await superadmin.get(`/incidents?search=${encodeURIComponent(message)}`)).body.data.incidents[0];
    expect(rouvert).toMatchObject({ statut: 'nouveau', occurrences: 3 });
  });

  it('réserve les incidents au super admin', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const admin = await login('admin@kafountine.gouv.sn');
    expect((await agent.get('/incidents')).status).toBe(403);
    expect((await admin.get('/incidents')).status).toBe(403);
    expect((await agent.get('/incidents/stats')).status).toBe(403);
  });

  it('refuse un statut inconnu', async () => {
    const superadmin = await login('superadmin@kafountine.gouv.sn');
    const premier = (await superadmin.get('/incidents?limit=1')).body.data.incidents[0];
    expect(premier).toBeDefined();
    expect((await superadmin.patch(`/incidents/${premier.id}`).send({ statut: 'supprime' })).status).toBe(400);
  });
});
