// Formations (cahier des charges, module 3) : présences, assiduité, clôture de la session et attestation.
const { describeIntegration, login } = require('./helpers/session');

describeIntegration('formations : suivi et attestation', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const year = new Date().getFullYear();
  let agent; let formationId; let assidu; let absent; let retire;

  const jeune = async (n) => {
    const res = await agent.post('/jeunes').send({
      nom: `Diatta${n}`, prenom: 'Awa', cni: `F${suffix}${n}`, telephone: `70${Date.now().toString().slice(-6)}${n}`, adresse: 'Kafountine',
      niveauEtude: 'BFEM', sexe: n % 2 ? 'F' : 'M', dateNaiss: '2004-03-01', year,
    });
    expect(res.status).toBe(201);
    expect((await agent.post(`/jeunes/${res.body.data.id}/formations/${formationId}`).send({})).status).toBe(201);
    return res.body.data.id;
  };
  const pointer = (id, present) => agent.post(`/jeunes/${id}/formations/${formationId}/presences`).send({ present });

  beforeAll(async () => {
    agent = await login('agent@kafountine.gouv.sn');
    const f = await agent.post('/formations').send({
      nom: `Transformation halieutique ${suffix}`, domaine: 'Pêche', duree: '3 mois', responsable: 'Mme Diop', budget: 500000,
      dateDebut: `${year}-01-10`, dateFin: `${year}-03-30`, statut: 'EN_COURS', year,
    });
    expect(f.status).toBe(201);
    formationId = f.body.data.id;
    assidu = await jeune(1);
    absent = await jeune(2);
    retire = await jeune(3);
  });

  it('calcule l’assiduité séance après séance', async () => {
    for (const present of [true, true, true, false]) expect((await pointer(assidu, present)).status).toBe(200);
    const dernier = await pointer(absent, false);
    expect(dernier.body.data).toMatchObject({ presences: 0, absences: 1, tauxAssiduite: 0 });
    expect((await agent.get(`/jeunes/${assidu}/formations/${formationId}/attestation`)).status).toBe(409);
  });

  it('retire un jeune de la formation sans supprimer sa fiche', async () => {
    expect((await agent.delete(`/jeunes/${retire}/formations/${formationId}`)).status).toBe(200);
    const fiche = (await agent.get(`/jeunes?search=F${suffix}3`)).body.data;
    expect(fiche.some((j) => j.id === retire)).toBe(true);
  });

  it('clôture la session, certifie au-delà de 75 % et délivre l’attestation', async () => {
    const cloture = await agent.post(`/formations/${formationId}/cloture`).send({});
    expect(cloture.status).toBe(200);
    expect(cloture.body.data).toMatchObject({ inscrits: 2, certifies: 1, seuil: 75 });
    const att = await agent.get(`/jeunes/${assidu}/formations/${formationId}/attestation`);
    expect(att.status).toBe(200);
    expect(att.body.data).toMatchObject({ prenom: 'Awa', tauxAssiduite: 75 });
    expect(att.body.data.numero).toMatch(new RegExp(`^ATT-${year}-[0-9A-F]{8}$`));
    expect((await agent.get(`/jeunes/${absent}/formations/${formationId}/attestation`)).status).toBe(409);
    expect((await pointer(assidu, true)).status).toBe(409);
    expect((await agent.delete(`/jeunes/${absent}/formations/${formationId}`)).status).toBe(409);
    expect((await agent.post(`/formations/${formationId}/cloture`).send({})).status).toBe(409);
  });
});
