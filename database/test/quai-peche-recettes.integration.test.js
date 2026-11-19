// Quai de pêche : la taxe de passage des camions frigorifiques et les droits du quai sont des recettes tracées
// (ticket numéroté, reçu, mode de paiement, agent), au tarif de l'arrêté du 8 mai 2024.
const { describeIntegration, login } = require('./helpers/session');

describeIntegration('quai de pêche : recettes tracées', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const year = new Date().getFullYear();
  let superadmin; let quai; let agent; let regisseur;
  let contribuableId;

  const camion = async (capacite) => {
    const res = await quai.post('/quai-peche/camions').send({ immatriculation: `QP-${suffix}-${capacite}`, marque: 'Isuzu', capacite, statut: 'ACTIF', year });
    expect(res.status).toBe(201);
    return res.body.data;
  };
  const expedition = async (camionId, poids) => {
    const res = await quai.post('/quai-peche/expeditions').send({ camionId, poids, destination: 'Ziguinchor', year });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  beforeAll(async () => {
    superadmin = await login('superadmin@kafountine.gouv.sn');
    quai = await login('quaipeche@kafountine.gouv.sn');
    agent = await login('agent@kafountine.gouv.sn');
    regisseur = await login('regisseur@kafountine.gouv.sn');
    const fiche = await superadmin.post('/contribuables').send({
      nin: `7${suffix}`.slice(0, 20), nom: 'Mareyeur', prenom: 'Test', dateNaiss: '1985-01-01', lieuNaiss: 'Kafountine', adresse: 'Quai', telephone: `77${Date.now().toString().slice(-7)}`,
    });
    expect(fiche.status).toBe(201);
    contribuableId = fiche.body.data.id;
  });

  it('enregistre la taxe d’un camion chargé au tarif de l’arrêté, une seule fois', async () => {
    const exp = await expedition((await camion(5000)).id, 3200);
    expect(exp.paiement).toBeUndefined();
    const paye = await quai.post(`/quai-peche/expeditions/${exp.id}/paiement`).send({ contribuableId, modePaiement: 'MOBILE_MONEY' });
    expect(paye.status).toBe(201);
    expect(paye.body.data.paiement).toMatchObject({ statut: 'PAYE', montant: 7500, modePaiement: 'MOBILE_MONEY', service: 'Camions frigorifiques charge - 1-10 tonnes' });
    expect(paye.body.data.paiement.numero).toMatch(/^TX-/);
    expect((await quai.post(`/quai-peche/expeditions/${exp.id}/paiement`).send({ contribuableId })).status).toBe(409);

    const caisse = (await quai.get('/caisse/journal')).body.data;
    expect(caisse.lignes.some((l) => l.numero === paye.body.data.paiement.numero && l.montant === 7500)).toBe(true);

    expect((await regisseur.delete(`/quai-peche/expeditions/${exp.id}`)).status).toBe(409);
  });

  it('ne montre au régisseur que les camions et expéditions du quai', async () => {
    for (const collection of ['pecheurs', 'embarcations', 'commissions']) {
      expect((await regisseur.get(`/quai-peche/${collection}?year=${year}`)).status).toBe(403);
      expect((await regisseur.post(`/quai-peche/${collection}`).send({})).status).toBe(403);
    }
    expect((await regisseur.get(`/quai-peche/camions?year=${year}`)).status).toBe(200);
    expect((await regisseur.get(`/quai-peche/expeditions?year=${year}`)).status).toBe(200);
    expect((await quai.get(`/quai-peche/pecheurs?year=${year}`)).status).toBe(200);
  });

  it('applique le tarif « vide » quand le camion repart sans chargement', async () => {
    const exp = await expedition((await camion(15000)).id, 0);
    const paye = await quai.post(`/quai-peche/expeditions/${exp.id}/paiement`).send({ contribuableId });
    expect(paye.status).toBe(201);
    expect(paye.body.data.paiement).toMatchObject({ montant: 7500, service: 'Camions frigorifiques vide - 10-20 tonnes', modePaiement: 'ESPECE' });
  });

  it('réserve la taxe de passage aux rôles du quai et exige un payeur', async () => {
    const exp = await expedition((await camion(800)).id, 500);
    expect((await agent.post(`/quai-peche/expeditions/${exp.id}/paiement`).send({ contribuableId })).status).toBe(403);
    expect((await quai.post(`/quai-peche/expeditions/${exp.id}/paiement`).send({})).status).toBe(400);
  });

  it('laisse le quai enregistrer ses droits, et seulement ceux-là', async () => {
    const saisonnier = await quai.post('/transactions').send({
      contribuableId, categorie: 'stationnement-transport', type: 'stationnement-transport', service: 'Transport maritime - Pecheurs saisonniers', quantite: 2, montant: 1, modePaiement: 'ESPECE',
    });
    expect(saisonnier.status).toBe(201);
    expect(Number(saisonnier.body.data.montant)).toBe(30000);
    const autre = await quai.post('/transactions').send({
      contribuableId, categorie: 'urbanisme', type: 'urbanisme', service: 'Permis - Permis construire habitation', quantite: 1, montant: 25000, modePaiement: 'ESPECE',
    });
    expect(autre.status).toBe(403);
  });
});
