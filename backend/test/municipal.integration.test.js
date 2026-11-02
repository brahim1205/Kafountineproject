/**
 * Tests d'intégration des services municipaux sur une base PostgreSQL migrée et seedée.
 * Activés avec RUN_INTEGRATION_TESTS=true (cf. .github/workflows/backend-ci.yml).
 */
const request = require('supertest');

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('services municipaux (intégration)', () => {
  const origin = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const password = process.env.SEED_DEFAULT_PASSWORD;
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).toUpperCase();
  let app;
  let admin;
  let agent;
  let contribuableId;

  async function login(email) {
    const session = request.agent(app);
    const res = await session.post('/api/v1/auth/login').set('Origin', origin).send({ email, password });
    expect(res.status).toBe(200);
    return {
      get: (path) => session.get(`/api/v1${path}`).set('Origin', origin),
      post: (path, body) => session.post(`/api/v1${path}`).set('Origin', origin).send(body),
      put: (path, body) => session.put(`/api/v1${path}`).set('Origin', origin).send(body),
      patch: (path, body) => session.patch(`/api/v1${path}`).set('Origin', origin).send(body),
      delete: (path) => session.delete(`/api/v1${path}`).set('Origin', origin),
    };
  }

  beforeAll(async () => {
    const { createApp } = require('../dist/src/app');
    app = createApp();
    admin = await login('superadmin@kafountine.gouv.sn');
    agent = await login('agent@kafountine.gouv.sn');
    const contribuables = await admin.get('/contribuables?limit=1');
    contribuableId = (contribuables.body.data.items || contribuables.body.data)[0].id;
  });

  afterAll(async () => {
    const { prisma } = require('../dist/src/shared/infrastructure/prisma/prismaClient');
    const { getRedisClient } = require('../dist/src/shared/infrastructure/redis/getRedisClient');
    await prisma.$disconnect();
    await (await getRedisClient())?.quit();
  });

  describe('marché', () => {
    let placeId;

    it('crée une place et refuse un numéro en double pour la même année', async () => {
      const place = { numeroPlace: `IT-${suffix}`, type: 'Étal', zone: 'Zone A', occupantId: contribuableId, tarif: 5000, year };
      const created = await admin.post('/marche/places', place);
      expect(created.status).toBe(201);
      expect(created.body.data.occupantId).toBe(contribuableId);
      placeId = created.body.data.id;

      const duplicate = await admin.post('/marche/places', place);
      expect(duplicate.status).toBe(409);
    });

    it('enregistre un paiement payé et un paiement en attente, et les reflète dans les statistiques', async () => {
      const before = (await admin.get(`/marche/statistiques?year=${year}`)).body.data;

      const paid = await admin.post('/marche/paiements', { placeId, montant: 5000, periode: 'Janvier', year });
      expect(paid.status).toBe(201);
      expect(paid.body.data.statut).toBe('PAYE');

      const pending = await admin.post('/marche/paiements', {
        placeId,
        montant: 3000,
        periode: 'Février',
        statut: 'EN_ATTENTE',
        datePaiement: `${year}-02-10`,
        year,
      });
      expect(pending.status).toBe(201);
      expect(pending.body.data.statut).toBe('EN_ATTENTE');
      expect(pending.body.data.datePaiement.startsWith(`${year}-02-10`)).toBe(true);

      const after = (await admin.get(`/marche/statistiques?year=${year}`)).body.data;
      expect(after.recettesMois - before.recettesMois).toBe(8000);
      expect(after.recettesEnRetard - before.recettesEnRetard).toBe(3000);
    });

    it("libère une place en retirant son occupant", async () => {
      const res = await admin.put(`/marche/places/${placeId}`, { occupantId: null, statut: 'LIBRE' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ occupantId: null, occupant: null, statut: 'LIBRE', activite: null, dateAttribution: null });
    });

    it('refuse un paiement sur une place inconnue ou avec un montant nul', async () => {
      const unknown = await admin.post('/marche/paiements', { placeId: '00000000-0000-4000-8000-000000000000', montant: 1000, periode: 'Mars' });
      expect(unknown.status).toBe(404);
      const zero = await admin.post('/marche/paiements', { placeId, montant: 0, periode: 'Mars' });
      expect(zero.status).toBe(400);
    });
  });

  describe('motos', () => {
    let motoId;

    it("rattache la moto à l'année d'exercice, pas à son année de fabrication", async () => {
      const created = await admin.post('/motos', {
        matricule: `IT-${suffix}`,
        marque: 'Jakarta',
        modele: 'JK125',
        annee: 2019,
        proprietaireId: contribuableId,
      });
      expect(created.status).toBe(201);
      motoId = created.body.data.id;

      const list = await admin.get(`/motos?year=${year}&search=it-${suffix.toLowerCase()}`);
      expect(list.body.data.map((moto) => moto.id)).toContain(motoId);
    });

    it('facture tarif + pénalité à une moto en retard puis la remet à jour', async () => {
      await admin.put(`/motos/${motoId}`, { enRetard: true, montantPenalite: 250 });

      const payment = await admin.post('/motos/paiements', { motoId, year });
      expect(payment.status).toBe(201);
      expect(payment.body.data.montant).toBe(1250);

      const [moto] = (await admin.get(`/motos?year=${year}&search=it-${suffix.toLowerCase()}`)).body.data;
      expect(moto.enRetard).toBe(false);
      expect(moto.dernierPaiement).not.toBeNull();
      expect(new Date(moto.prochainPaiement).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('budget', () => {
    it('applique le cycle de vie des lignes et des demandes', async () => {
      const before = (await admin.get(`/budget/stats?year=${year}`)).body.data;
      const line = await admin.post('/budget/lignes', { code: `it-${suffix}`, libelle: 'Ligne test', prevu: 1000000, year });
      expect(line.status).toBe(201);
      expect(line.body.data.code).toBe(`IT-${suffix}`);

      const duplicate = await admin.post('/budget/lignes', { code: `IT-${suffix}`, libelle: 'Doublon', prevu: 1, year });
      expect(duplicate.status).toBe(409);

      const updated = await admin.put(`/budget/lignes/${line.body.data.id}`, { depense: 400000 });
      expect(Number(updated.body.data.depense)).toBe(400000);
      expect(Number(updated.body.data.prevu)).toBe(1000000);

      const demande = await agent.post('/budget/demandes', { service: 'Voirie', description: 'Pavage', montant: 300000, year });
      expect(demande.status).toBe(201);
      expect(demande.body.data.statut).toBe('EN_ATTENTE');

      const invalid = await admin.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'APPROUVEE' });
      expect(invalid.status).toBe(400);

      const approved = await admin.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'APPROUVE' });
      expect(approved.status).toBe(200);
      expect(approved.body.data.approvedById).toBeTruthy();

      const after = (await admin.get(`/budget/stats?year=${year}`)).body.data;
      expect(after.demandesApprouvees - before.demandesApprouvees).toBe(1);
      expect(after.totalDepense - before.totalDepense).toBe(400000);
    });

    it('refuse les lignes budgétaires aux agents', async () => {
      const res = await agent.get('/budget/lignes');
      expect(res.status).toBe(403);
    });
  });

  describe('quai de pêche', () => {
    it('conserve les champs absents lors d’une mise à jour partielle', async () => {
      const created = await admin.post('/quai-peche/pecheurs', { nom: 'Sané', prenom: 'Lamine', telephone: '770000000', year });
      expect(created.status).toBe(201);

      const updated = await admin.put(`/quai-peche/pecheurs/${created.body.data.id}`, { statut: 'INACTIF' });
      expect(updated.status).toBe(200);
      expect(updated.body.data).toMatchObject({ nom: 'Sané', prenom: 'Lamine', telephone: '770000000', statut: 'INACTIF' });

      const truck = await admin.post('/quai-peche/camions', { immatriculation: `it-${suffix}`, marque: 'Isuzu', capacite: 8, year });
      const updatedTruck = await admin.put(`/quai-peche/camions/${truck.body.data.id}`, { chauffeur: 'Ousmane' });
      expect(updatedTruck.body.data).toMatchObject({ immatriculation: `IT-${suffix}`, marque: 'Isuzu', capacite: 8, chauffeur: 'Ousmane' });
    });

    it('renvoie 404 pour une ressource inconnue', async () => {
      const unknownId = '00000000-0000-4000-8000-000000000000';
      expect((await admin.put(`/quai-peche/commissions/${unknownId}`, { poids: 10 })).status).toBe(404);
      expect((await admin.put(`/quai-peche/pecheurs/${unknownId}`, { nom: 'X' })).status).toBe(404);
      expect((await admin.delete(`/quai-peche/expeditions/${unknownId}`)).status).toBe(404);
    });
  });

  describe('sauvegardes', () => {
    it('restaure une sauvegarde contenant des montants décimaux', async () => {
      const before = await admin.get(`/budget/lignes?year=${year}`);
      const backup = await admin.post('/settings/backups', {});
      expect(backup.status).toBe(201);

      const temporary = await admin.post('/budget/lignes', { code: `TMP-${suffix}`, libelle: 'À effacer', prevu: 10.5, year });
      expect(temporary.status).toBe(201);

      const restored = await admin.post('/settings/backups/restore', { filename: backup.body.data.filename });
      expect(restored.status).toBe(200);

      const after = await admin.get(`/budget/lignes?year=${year}`);
      expect(after.body.data).toEqual(before.body.data);
    });
  });
});
