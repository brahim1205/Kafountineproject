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
      // Le paiement en attente compte dans les retards, pas dans les recettes.
      expect(after.recettesMois - before.recettesMois).toBe(5000);
      expect(after.recettesEnRetard - before.recettesEnRetard).toBe(3000);
    });

    it('encaisse le paiement en attente au lieu de le dupliquer, puis refuse un second encaissement', async () => {
      const before = (await admin.get(`/marche/statistiques?year=${year}`)).body.data;

      const settled = await admin.post('/marche/paiements', { placeId, montant: 3000, periode: 'Février', reference: `MRC-${suffix}`, year });
      expect(settled.status).toBe(201);
      expect(settled.body.data).toMatchObject({ statut: 'PAYE', reference: `MRC-${suffix}`, montant: 3000 });

      const payments = (await admin.get(`/marche/paiements?year=${year}`)).body.data;
      const list = payments.items || payments;
      expect(list.filter((item) => item.placeId === placeId && item.periode === 'Février')).toHaveLength(1);

      const after = (await admin.get(`/marche/statistiques?year=${year}`)).body.data;
      expect(after.recettesMois - before.recettesMois).toBe(3000);
      expect(before.recettesEnRetard - after.recettesEnRetard).toBe(3000);

      const again = await admin.post('/marche/paiements', { placeId, montant: 3000, periode: 'Février', year });
      expect(again.status).toBe(409);
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

  describe('recettes', () => {
    // Payload exact de createTransaction (front/src/services/taxes.ts), envoyé par Recettes et Taxes.
    it('enregistre un ticket avec la catégorie envoyée par le frontend', async () => {
      const res = await agent.post('/transactions', {
        contribuableId,
        categorie: 'Marché',
        type: 'Marché',
        service: 'Ticket journalier',
        quantite: 1,
        montant: 1500,
        modePaiement: 'ESPECE',
        reference: `REC-${suffix}`,
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ categorie: 'Marché', service: 'Ticket journalier' });
      expect(Number(res.body.data.montant)).toBe(1500);

      // Chaque encaissement laisse une trace dans le journal d'audit.
      const numero = res.body.data.numero;
      const journal = (await admin.get(`/audit?year=${year}&search=${encodeURIComponent(numero)}`)).body.data;
      expect(journal.logs.map((log) => log.action)).toContain('Encaissement');

      const updated = await admin.put(`/transactions/${res.body.data.id}`, { montant: 2000 });
      expect(updated.status).toBe(200);
      const deleted = await admin.delete(`/transactions/${res.body.data.id}`);
      expect(deleted.status).toBe(200);
      const actions = (await admin.get(`/audit?year=${year}&search=${encodeURIComponent(numero)}`)).body.data.logs.map((log) => log.action);
      expect(actions).toEqual(expect.arrayContaining(['Encaissement', 'Modification transaction', 'Suppression transaction']));
      expect((await admin.delete(`/transactions/${res.body.data.id}`)).status).toBe(404);
    });
  });

  describe('formulaires de modification', () => {
    it('modifie un contribuable avec le NIN renvoyé par le formulaire, et refuse un NIN déjà pris', async () => {
      const list = (await admin.get('/contribuables?limit=2')).body.data;
      const [first, second] = list.items || list;
      const same = await admin.put(`/contribuables/${first.id}`, { nin: first.nin, nom: first.nom, prenom: first.prenom, telephone: first.telephone, isActive: true });
      expect(same.status).toBe(200);
      const taken = await admin.put(`/contribuables/${first.id}`, { nin: second.nin });
      expect(taken.status).toBe(409);
    });

    it("change le contribuable d'une demande d'état civil", async () => {
      const list = (await admin.get('/contribuables?limit=2')).body.data;
      const [first, second] = list.items || list;
      const created = await admin.post('/etat-civil', { contribuableId: first.id, typeDocument: 'Extrait de naissance', exemplaires: 1, montant: 500, year });
      expect(created.status).toBe(201);
      const id = created.body.data.id;

      const moved = await admin.put(`/etat-civil/${id}`, { typeDocument: 'Extrait de naissance', contribuableId: second.id, montant: 500, exemplaires: 2, statut: 'EN_ATTENTE' });
      expect(moved.status).toBe(200);
      expect(moved.body.data.contribuableId).toBe(second.id);
      expect(JSON.stringify(moved.body.data)).toContain(second.nom);

      const unknown = await admin.put(`/etat-civil/${id}`, { contribuableId: '00000000-0000-4000-8000-000000000000' });
      expect(unknown.status).toBe(404);
      await admin.delete(`/etat-civil/${id}`);
    });
  });

  describe('mot de passe', () => {
    it('change son mot de passe, refuse l’ancien puis le remet', async () => {
      const email = 'quaipeche@kafountine.gouv.sn';
      const nouveau = `Kafountine-${suffix}-9x!`;
      const user = await login(email);

      const wrong = await user.post('/auth/change-password', { currentPassword: 'Faux-mot-de-passe-1!', newPassword: nouveau });
      expect(wrong.status).toBe(401);
      const weak = await user.post('/auth/change-password', { currentPassword: password, newPassword: 'trop-faible-123' });
      expect(weak.status).toBe(400);

      const changed = await user.post('/auth/change-password', { currentPassword: password, newPassword: nouveau });
      expect(changed.status).toBe(200);

      const oldLogin = await request(app).post('/api/v1/auth/login').set('Origin', origin).send({ email, password });
      expect(oldLogin.status).toBe(401);
      const relogged = await request.agent(app).post('/api/v1/auth/login').set('Origin', origin).send({ email, password: nouveau });
      expect(relogged.status).toBe(200);

      const restored = await user.post('/auth/change-password', { currentPassword: nouveau, newPassword: password });
      expect(restored.status).toBe(200);
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

  describe('tableau de bord', () => {
    it('compte les recettes de tous les modules, par source', async () => {
      const stats = (await admin.get(`/dashboard/statistiques?year=${year}`)).body.data;
      const sources = Object.fromEntries(stats.recettesParSource.map((item) => [item.source, item.montant]));
      // Le paiement marché encaissé plus haut figure dans les recettes, à côté des taxes.
      expect(sources['Marché']).toBeGreaterThanOrEqual(8000);
      const sum = stats.recettesParSource.reduce((total, item) => total + item.montant, 0);
      expect(stats.totalRecettes).toBeCloseTo(sum, 2);
      expect(stats.evolutionMensuelle).toHaveLength(12);
      const categories = stats.categories.reduce((total, item) => total + item.montant, 0);
      expect(categories).toBeCloseTo(sum, 2);
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
      // Montants en nombres JSON (Decimal en base), pas en chaînes.
      expect(updated.body.data.depense).toBe(400000);
      expect(updated.body.data.prevu).toBe(1000000);

      const demande = await agent.post('/budget/demandes', { service: 'Voirie', description: 'Pavage', montant: 300000, year });
      expect(demande.status).toBe(201);
      expect(demande.body.data.statut).toBe('EN_ATTENTE');
      expect(demande.body.data.montant).toBe(300000);

      const invalid = await admin.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'APPROUVEE' });
      expect(invalid.status).toBe(400);

      const approved = await admin.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'APPROUVE' });
      expect(approved.status).toBe(200);
      expect(approved.body.data.approvedById).toBeTruthy();

      const after = (await admin.get(`/budget/stats?year=${year}`)).body.data;
      expect(after.demandesApprouvees - before.demandesApprouvees).toBe(1);
      expect(after.totalDepense - before.totalDepense).toBe(400000);
    });

    it('réserve la décision sur une demande de dépense à l’administration', async () => {
      const finances = await login('finances@kafountine.gouv.sn');
      const demande = await finances.post('/budget/demandes', { service: 'Finances', description: 'Fournitures', montant: 50000, year });
      expect(demande.status).toBe(201);

      const selfApproval = await finances.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'APPROUVE' });
      expect(selfApproval.status).toBe(403);

      const rejected = await admin.put(`/budget/demandes/${demande.body.data.id}`, { statut: 'REJETE', motif: 'Hors budget' });
      expect(rejected.status).toBe(200);
      expect(rejected.body.data.statut).toBe('REJETE');
    });

    it('accepte une description vide (null), puis la retire en modification', async () => {
      const line = await admin.post('/budget/lignes', { code: `nd-${suffix}`, libelle: 'Sans description', description: null, prevu: 1000, year });
      expect(line.status).toBe(201);
      expect(line.body.data.description).toBeNull();

      const withText = await admin.put(`/budget/lignes/${line.body.data.id}`, { description: 'Texte' });
      expect(withText.body.data.description).toBe('Texte');
      const cleared = await admin.put(`/budget/lignes/${line.body.data.id}`, { description: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.description).toBeNull();
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

  describe('unité de travail', () => {
    const load = (path) => require(`../dist/src/${path}`);
    const { transactional } = load('shared/application/UnitOfWork');
    const { PrismaUnitOfWork } = load('shared/infrastructure/prisma/transactionContext');
    const { PrismaAuditTrail } = load('shared/infrastructure/audit/PrismaAuditTrail');
    const { BudgetService } = load('modules/budget/application/BudgetService');
    const { PrismaBudgetRepository } = load('modules/budget/infrastructure/PrismaBudgetRepository');
    const actor = { userId: null, role: 'ADMIN', ipAddress: '127.0.0.1' };
    const repository = new PrismaBudgetRepository();
    const budget = (auditTrail) => transactional(new BudgetService(repository, auditTrail), new PrismaUnitOfWork(), ['createLine']);

    it("annule l'écriture quand l'audit échoue", async () => {
      const code = `UOW-KO-${suffix}`;
      const failingAudit = { record: () => Promise.reject(new Error('audit indisponible')) };

      await expect(budget(failingAudit).createLine(actor, { code, libelle: 'Rollback', prevu: 1000, year })).rejects.toThrow(
        'audit indisponible'
      );
      expect(await repository.findLineByCode(code, year)).toBeNull();
    });

    it("valide ensemble l'écriture et son entrée d'audit", async () => {
      const code = `UOW-OK-${suffix}`;

      await budget(new PrismaAuditTrail()).createLine(actor, { code, libelle: 'Commit', prevu: 1000, year });

      expect(await repository.findLineByCode(code, year)).toMatchObject({ code });
      const logs = (await admin.get(`/audit?year=${year}&limit=200`)).body.data;
      const items = logs.items || logs.logs || logs;
      expect(JSON.stringify(items)).toContain(code);
    });
  });

  describe('journal d’audit', () => {
    it('filtre, compte et pagine en base', async () => {
      const all = (await admin.get(`/audit?year=${year}&limit=1`)).body.data;
      expect(all.logs).toHaveLength(1);
      expect(all.pagination.total).toBe(all.stats.total);
      expect(all.stats.success + all.stats.warning + all.stats.error).toBeLessThanOrEqual(all.stats.total);

      const page2 = (await admin.get(`/audit?year=${year}&limit=1&page=2`)).body.data;
      if (all.stats.total > 1) expect(page2.logs[0].id).not.toBe(all.logs[0].id);

      const warnings = (await admin.get(`/audit?year=${year}&statut=warning&limit=200`)).body.data;
      expect(warnings.logs.every((item) => item.status === 'warning')).toBe(true);
      expect(warnings.stats.total).toBe(all.stats.warning);
    });

    it('traite les jokers SQL de la recherche comme du texte', async () => {
      const res = (await admin.get(`/audit?year=${year}&search=${encodeURIComponent('%_%')}`)).body.data;
      expect(res.stats.total).toBe(0);
    });
  });
});
