// SEC-09 : sauvegardes réservées au super administrateur, état civil cloisonné, années closes en lecture seule.
const { describeIntegration, login, anonymous } = require('./helpers/session');

describeIntegration('SEC-09 droits', () => {
  let superadmin; let admin; let regisseur; let etatCivil; let agent;

  beforeAll(async () => {
    superadmin = await login('superadmin@kafountine.gouv.sn');
    admin = await login('admin@kafountine.gouv.sn');
    regisseur = await login('regisseur@kafountine.gouv.sn');
    etatCivil = await login('etatcivil@kafountine.gouv.sn');
    agent = await login('agent@kafountine.gouv.sn');
  });

  const isEtatCivil = (t) => /^[eé]tat.civil/i.test(t.categorie);

  it('refuse les sauvegardes à l’administrateur', async () => {
    expect((await superadmin.get('/settings/backups')).status).toBe(200);
    expect((await admin.get('/settings/backups')).status).toBe(403);
    expect((await admin.get('/settings/backups/backup-2026-01-01-000000.json/download')).status).toBe(403);
  });

  it('cache les tickets d’état civil au régisseur', async () => {
    const all = await regisseur.get('/transactions?limit=300');
    expect(all.status).toBe(200);
    expect(all.body.data.filter(isEtatCivil)).toEqual([]);
    expect((await regisseur.get('/transactions?categorie=etat-civil&limit=50')).body.data).toEqual([]);
  });

  it('limite le compte état civil à ses tickets', async () => {
    const all = await etatCivil.get('/transactions?limit=300');
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBeGreaterThan(0);
    expect(all.body.data.every(isEtatCivil)).toBe(true);
  });

  it('refuse un paiement sur une année close', async () => {
    const moto = (await agent.get('/motos?limit=1')).body.data[0];
    expect((await agent.post('/motos/paiements').send({ motoId: moto.id, type: 'COTISATION', year: 2019 })).status).toBe(403);
    const place = (await agent.get('/marche/places')).body.data[0];
    expect((await agent.post('/marche/paiements').send({ placeId: place.id, montant: 1000, periode: 'janvier 2019', year: 2019 })).status).toBe(403);
  });

  it('retire les routes sans usage', async () => {
    expect((await superadmin.post('/audit/seed').send({})).status).toBe(404);
    expect((await anonymous().get('/api/v1/public/penalites')).status).toBe(404);
  });
});
