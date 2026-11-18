// Retrait des motos par le régisseur et CNI facultative pour les contribuables.
const { describeIntegration, login } = require('./helpers/session');

describeIntegration('Motos retirées et CNI facultative', () => {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).toUpperCase();
  let regisseur;
  let agent;

  beforeAll(async () => {
    regisseur = await login('regisseur@kafountine.gouv.sn');
    agent = await login('agent@kafountine.gouv.sn');
  });

  const contribuable = async (session, telephone, nin) => {
    const res = await session.post('/contribuables').send({
      nom: 'Essai', prenom: suffix, dateNaiss: '2015-01-01', lieuNaiss: 'Kafountine', adresse: 'Kafountine', telephone, ...(nin ? { nin } : {}),
    });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  it('accepte plusieurs contribuables sans CNI', async () => {
    const telephone = String(Date.now()).slice(-7);
    const premier = await contribuable(agent, `77${telephone}`);
    const second = await contribuable(agent, `78${telephone}`);
    expect(premier.nin ?? null).toBeNull();
    expect(second.id).not.toBe(premier.id);
  });

  it('laisse le régisseur retirer une moto, mais garde ses paiements', async () => {
    const proprietaire = await contribuable(regisseur, `76${String(Date.now()).slice(-7)}`, `CNI${suffix}`);
    const moto = await regisseur.post('/motos').send({
      matricule: `RT-${suffix}`, marque: 'Jakarta', modele: 'JK', annee: 2024, proprietaireId: proprietaire.id, year,
    });
    expect(moto.status).toBe(201);
    const id = moto.body.data.id;

    expect((await agent.delete(`/motos/${id}`)).status).toBe(403);

    const retrait = await regisseur.delete(`/motos/${id}`);
    expect(retrait.status).toBe(200);
    // Le droit d'adhésion enregistré à la création est conservé : la moto est retirée, pas effacée.
    expect(retrait.body.data.retiree).toBe(true);

    const liste = await regisseur.get(`/motos?year=${year}&page=1&limit=100&search=${encodeURIComponent(`RT-${suffix}`)}`);
    expect(liste.body.data.some((m) => m.id === id)).toBe(false);
    const paiements = await regisseur.get(`/motos/paiements?year=${year}&page=1&limit=100`);
    expect(paiements.body.data.some((p) => (p.motoId ?? p.moto?.id) === id)).toBe(true);
    expect((await regisseur.delete(`/motos/${id}`)).status).toBe(404);
    expect((await regisseur.post('/motos/paiements').send({ motoId: id })).status).toBe(404);
  });
});
