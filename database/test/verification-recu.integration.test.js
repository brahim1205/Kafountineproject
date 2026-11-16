// Interface contribuable : vérification publique d'un reçu, sans connexion et sans donnée personnelle.
const { describeIntegration, login, anonymous } = require('./helpers/session');

describeIntegration('vérification publique d’un reçu', () => {
  let numero;

  beforeAll(async () => {
    const superadmin = await login('superadmin@kafountine.gouv.sn');
    const liste = await superadmin.get('/transactions?limit=50&statut=PAYE');
    numero = liste.body.data.find((t) => t.numero).numero;
  });

  it('confirme un reçu existant sans session ni donnée personnelle', async () => {
    const res = await anonymous().get(`/api/v1/public/recus/${encodeURIComponent(numero)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ numero, etat: 'VALIDE' });
    expect(Object.keys(res.body.data).sort()).toEqual(['date', 'etat', 'montant', 'numero', 'objet', 'service']);
  });

  it('accepte le numéro en minuscules', async () => {
    expect((await anonymous().get(`/api/v1/public/recus/${encodeURIComponent(numero.toLowerCase())}`)).status).toBe(200);
  });

  it('refuse un numéro inconnu', async () => {
    expect((await anonymous().get('/api/v1/public/recus/FAUX-2026-000')).status).toBe(404);
  });
});
