/**
 * Tests d'intégration des services municipaux sur une base PostgreSQL migrée et seedée.
 * Activés avec RUN_INTEGRATION_TESTS=true (cf. .github/workflows/backend-ci.yml).
 */
const request = require('supertest');

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
// Scénarios exécutés contre le backend Spring Boot déjà démarré.
const { PrismaClient } = require('@prisma/client');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const prisma = new PrismaClient();

describeIntegration('services municipaux (intégration)', () => {
  const origin = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const password = process.env.SEED_DEFAULT_PASSWORD;
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).toUpperCase();
  let admin;
  let agent;
  let contribuableId;

  async function login(email) {
    const session = request.agent(API_BASE_URL);
    const res = await session.post('/api/v1/auth/login').set('Origin', origin).send({ email, password });
    expect(res.status).toBe(200);
    return {
      raw: session,
      get: (path) => session.get(`/api/v1${path}`).set('Origin', origin),
      post: (path, body) => session.post(`/api/v1${path}`).set('Origin', origin).send(body),
      put: (path, body) => session.put(`/api/v1${path}`).set('Origin', origin).send(body),
      patch: (path, body) => session.patch(`/api/v1${path}`).set('Origin', origin).send(body),
      delete: (path) => session.delete(`/api/v1${path}`).set('Origin', origin),
    };
  }

  beforeAll(async () => {
    admin = await login('superadmin@kafountine.gouv.sn');
    agent = await login('agent@kafountine.gouv.sn');
    const contribuables = await admin.get('/contribuables?limit=1');
    contribuableId = (contribuables.body.data.items || contribuables.body.data)[0].id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('administrateur en consultation seule', () => {
    it('lit tout mais ne peut rien modifier', async () => {
      const lecteur = await login('admin@kafountine.gouv.sn');
      expect((await lecteur.get(`/transactions?year=${year}&limit=1`)).status).toBe(200);
      expect((await lecteur.get(`/dashboard/statistiques?year=${year}`)).status).toBe(200);

      const ticket = await lecteur.post('/transactions', { contribuableId, categorie: 'Marché', type: 'Marché', service: 'Ticket', quantite: 1, montant: 100 });
      expect(ticket.status).toBe(403);
      expect(ticket.body.message).toContain('consultation seule');
      expect((await lecteur.post('/contribuables', {})).status).toBe(403);
      expect((await lecteur.post('/users', {})).status).toBe(403);

      // Son propre mot de passe reste modifiable (ici refusé pour mot de passe actuel erroné, pas pour le rôle).
      const pwd = await lecteur.post('/auth/change-password', { currentPassword: 'Faux-mot-de-passe-1!', newPassword: 'Nouveau-Mot-De-Passe-2026!' });
      expect(pwd.status).toBe(401);
    });
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
      expect(actions).toEqual(expect.arrayContaining(['Encaissement', 'Modification transaction', 'Annulation transaction']));
      expect((await admin.delete(`/transactions/${res.body.data.id}`)).status).toBe(409);
    });
  });

  describe('numérotation', () => {
    const ticket = () => ({ contribuableId, categorie: 'Marché', type: 'Marché', service: 'Ticket journalier', quantite: 1, montant: 100, modePaiement: 'ESPECE' });

    it('démarre le compteur après le plus grand numéro existant, comparé comme un nombre (999 → 1000)', async () => {
      const seed = await agent.post('/transactions', ticket());
      expect(seed.status).toBe(201);
      await prisma.transaction.update({ where: { numero: seed.body.data.numero }, data: { numero: `TX-${year}-999` } });
      // Compteur absent (base existante, nouvelle année…) : il est recréé à partir des tickets.
      await prisma.numeroCounter.deleteMany({ where: { serie: 'transaction', annee: year } });

      const next = await agent.post('/transactions', ticket());
      const after = await agent.post('/transactions', ticket());
      expect([next.status, after.status]).toEqual([201, 201]);
      expect(next.body.data.numero).toBe(`TX-${year}-1000`);
      expect(after.body.data.numero).toBe(`TX-${year}-1001`);
    });

    it('saute un numéro déjà pris (sauvegarde restaurée, saisie manuelle) au lieu d’échouer', async () => {
      await prisma.transaction.update({ where: { numero: `TX-${year}-999` }, data: { numero: `TX-${year}-1003` } });

      const free = await agent.post('/transactions', ticket());
      const taken = await agent.post('/transactions', ticket());
      expect([free.status, taken.status]).toEqual([201, 201]);
      expect(free.body.data.numero).toBe(`TX-${year}-1002`);
      expect(taken.body.data.numero).toBe(`TX-${year}-1004`);
    });

    it('attribue des numéros distincts et consécutifs à des demandes simultanées', async () => {
      const created = await Promise.all(
        Array.from({ length: 10 }, () =>
          admin.post('/etat-civil', { contribuableId, typeDocument: 'Extrait de naissance', exemplaires: 1, montant: 500, year })
        )
      );
      expect(created.map((res) => res.status)).toEqual(Array(10).fill(201));
      const numbers = created.map((res) => Number(res.body.data.numero.split('-').pop())).sort((a, b) => a - b);
      expect(new Set(numbers).size).toBe(10);
      expect(numbers[9] - numbers[0]).toBe(9);
      for (const res of created) await admin.delete(`/etat-civil/${res.body.data.id}`);
    });

    it('numérote lui-même les reçus de moto', async () => {
      const motos = (await admin.get(`/motos?year=${year}`)).body.data;
      const moto = (motos.items || motos)[0];
      const first = await admin.post('/motos/paiements', { motoId: moto.id, reference: 'saisie-navigateur', year });
      const second = await admin.post('/motos/paiements', { motoId: moto.id, year });
      expect([first.status, second.status]).toEqual([201, 201]);
      expect(first.body.data.numeroRecu).toMatch(new RegExp(`^MOTO-${year}-\\d{5}$`));
      expect(Number(second.body.data.numeroRecu.split('-').pop()) - Number(first.body.data.numeroRecu.split('-').pop())).toBe(1);
    });
  });

  describe('tickets à fort volume', () => {
    const categorie = `IT-${suffix}`;

    beforeAll(async () => {
      for (const statut of ['PAYE', 'PAYE', 'EN_ATTENTE']) {
        const res = await agent.post('/transactions', {
          contribuableId, categorie, type: categorie, service: 'Ticket test', quantite: 1, montant: 100, modePaiement: 'ESPECE', statut,
        });
        expect(res.status).toBe(201);
      }
    });

    it('pagine côté serveur et renvoie le total et le montant encaissé de toute la sélection', async () => {
      const res = await agent.get(`/transactions?categorie=${categorie}&year=${year}&limit=1&page=2`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 3, totalPages: 3, montantPaye: 200 });
    });

    it("n'expose jamais le mot de passe de l'agent d'un ticket", async () => {
      const res = await agent.get(`/transactions?categorie=${categorie}&year=${year}&limit=3`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].agent).toMatchObject({ nom: expect.any(String), prenom: expect.any(String) });
      for (const ticket of res.body.data) expect(ticket.agent).not.toHaveProperty('password');
    });

    it('filtre par agent et par jour de paiement', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const me = (await agent.get('/auth/me')).body.data;
      const mine = await agent.get(`/transactions?categorie=${categorie}&agentId=${me.id}&startDate=${today}&endDate=${today}`);
      expect(mine.body.meta.total).toBe(3);
      const other = await agent.get(`/transactions?categorie=${categorie}&agentId=00000000-0000-4000-8000-000000000000`);
      expect(other.body.meta.total).toBe(0);
      const yesterday = await agent.get(`/transactions?categorie=${categorie}&endDate=2000-01-01`);
      expect(yesterday.body.meta.total).toBe(0);
      const invalid = await agent.get('/transactions?startDate=04/11/2026');
      expect(invalid.status).toBe(400);
    });

    it('étend le filtre de catégorie à toutes ses formes stockées', async () => {
      const ticket = (categorie) => ({ contribuableId, categorie, type: categorie, service: 'Acte', quantite: 1, montant: 300 });
      const before = (await agent.get(`/transactions?categorie=etat-civil&year=${year}&limit=1`)).body.meta;
      expect((await agent.post('/transactions', ticket('ETAT_CIVIL'))).status).toBe(201);
      expect((await agent.post('/transactions', ticket('État civil'))).status).toBe(201);
      const after = (await agent.get(`/transactions?categorie=etat-civil&year=${year}&limit=1`)).body.meta;
      expect(after.total - before.total).toBe(2);
      expect(after.montantPaye - before.montantPaye).toBe(600);
      expect(after.nombrePaye - before.nombrePaye).toBe(2);
      const used = (await agent.get(`/transactions/categories-utilisees?year=${year}`)).body.data;
      expect(used.filter((item) => item.libelle === 'État civil')).toHaveLength(1);
    });

    it('liste les catégories utilisées de l’année pour les filtres', async () => {
      const res = await agent.get(`/transactions/categories-utilisees?year=${year}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ valeur: categorie, nombre: 3 })]));
    });

    it('exporte en CSV toute la sélection (et non un fichier vide)', async () => {
      const res = await admin.get(`/transactions/export?categorie=${categorie}&year=${year}`).buffer(true).parse((response, callback) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => callback(null, text));
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      const lines = res.body.replace(/^\uFEFF/, '').trim().split('\r\n');
      expect(lines[0]).toContain('Numéro');
      expect(lines).toHaveLength(4);
      expect(lines.filter((l) => l.includes(',PAYE,'))).toHaveLength(2);
      const forbidden = await agent.get('/transactions/export');
      expect(forbidden.status).toBe(403);
    });

    it('calcule les statistiques de l’année en base', async () => {
      const res = await admin.get(`/transactions/statistiques?year=${year}`);
      expect(res.status).toBe(200);
      const line = res.body.data.annee.categories.find((item) => item.nom === categorie);
      expect(line).toMatchObject({ montant: 200 });
      expect(res.body.data.totalTransactions).toBeGreaterThanOrEqual(3);
    });
  });

  describe('suppression de contribuable', () => {
    const fiche = (n) => ({
      nin: `9${suffix}${n}`.slice(0, 20), nom: 'Test', prenom: `Suppression${n}`, dateNaiss: '1990-01-01',
      lieuNaiss: 'Kafountine', adresse: 'Kafountine', telephone: `77${Date.now().toString().slice(-6)}${n}`,
    });

    it('refuse de supprimer une fiche qui a des tickets, et supprime une fiche vierge', async () => {
      const withTicket = await admin.post('/contribuables', fiche(1));
      expect(withTicket.status).toBe(201);
      const ticketRes = await agent.post('/transactions', {
        contribuableId: withTicket.body.data.id, categorie: 'Marché', type: 'Marché', service: 'Ticket', quantite: 1, montant: 100,
      });
      expect(ticketRes.status).toBe(201);
      const refused = await admin.delete(`/contribuables/${withTicket.body.data.id}`);
      expect(refused.status).toBe(409);
      expect(refused.body.message).toContain('1 ticket');

      const blank = await admin.post('/contribuables', fiche(2));
      expect(blank.status).toBe(201);
      const deleted = await admin.delete(`/contribuables/${blank.body.data.id}`);
      expect(deleted.status).toBe(200);
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

      const oldLogin = await request(API_BASE_URL).post('/api/v1/auth/login').set('Origin', origin).send({ email, password });
      expect(oldLogin.status).toBe(401);
      const relogged = await request.agent(API_BASE_URL).post('/api/v1/auth/login').set('Origin', origin).send({ email, password: nouveau });
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
      expect(payment.body.data.montant).toBe(12000);

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

  describe('règles des motos', () => {
    const moto = (m) => ({ matricule: `R-${suffix}-${m}`, marque: 'TVS', modele: 'X', annee: 2024, proprietaireId: contribuableId, year });
    let motoId;

    it('encaisse l’adhésion à 5 000 F avec son reçu', async () => {
      const created = await agent.post('/motos', moto('A'));
      expect(created.status).toBe(201);
      motoId = created.body.data.id;
      expect(created.body.data.adhesion).toMatchObject({ type: 'ADHESION', montant: 5000 });
      expect(created.body.data.adhesion.numeroRecu).toMatch(/^MOTO-/);
    });

    it('facture 2 000 F à jour, 12 000 F après la date limite, et 25 000 F d’amende', async () => {
      expect((await agent.post('/motos/paiements', { motoId, year })).body.data.montant).toBe(2000);
      await prisma.motoRegistration.update({ where: { id: motoId }, data: { prochainPaiement: new Date('2020-01-10T23:59:59.999Z') } });
      const retard = await agent.post('/motos/paiements', { motoId, year });
      expect(retard.body.data.montant).toBe(12000);
      const amende = await agent.post('/motos/paiements', { motoId, type: 'AMENDE_POLICE', year });
      expect(amende.body.data).toMatchObject({ type: 'AMENDE_POLICE', montant: 25000 });
    });

    it('refuse un montant fourni par le navigateur', async () => {
      expect((await agent.post('/motos/paiements', { motoId, montant: 1, year })).status).toBe(400);
    });
  });

  describe('protection des recettes', () => {
    const base = () => ({ contribuableId, categorie: 'etat-civil', type: 'etat-civil', service: 'Naissance - Extrait de naissance', quantite: 2, montant: 1 });

    it('applique le tarif du catalogue au lieu du montant envoyé', async () => {
      const res = await agent.post('/transactions', base());
      expect(res.status).toBe(201);
      expect(Number(res.body.data.montant)).toBe(600);
    });

    it('ne crée qu’une recette quand une requête est rejouée', async () => {
      const key = `it-${suffix}`;
      const send = () => agent.raw.post('/api/v1/transactions').set('Origin', origin).set('idempotency-key', key).send(base());
      const first = await send();
      const second = await send();
      expect([first.status, second.status]).toEqual([201, 201]);
      expect(second.body.data.numero).toBe(first.body.data.numero);
    });

    it('annule une recette sans l’effacer', async () => {
      const { body } = await agent.post('/transactions', base());
      expect((await admin.delete(`/transactions/${body.data.id}`)).status).toBe(200);
      const row = await prisma.transaction.findUnique({ where: { id: body.data.id } });
      expect(row.statut).toBe('ANNULE');
    });
  });

  describe('séparation des rôles', () => {
    it('interdit l’état civil aux agents et au régisseur, en lecture comme en écriture', async () => {
      const regisseur = await login('regisseur@kafountine.gouv.sn');
      for (const session of [agent, regisseur]) {
        expect((await session.get(`/etat-civil?year=${year}`)).status).toBe(403);
        expect((await session.post('/etat-civil', {})).status).toBe(403);
      }
      expect((await regisseur.get('/etat-civil/statistiques')).status).toBe(403);
    });

    it('limite le régisseur aux comptes de terrain', async () => {
      const regisseur = await login('regisseur@kafountine.gouv.sn');
      const users = (await regisseur.get('/users')).body.data;
      expect([...new Set(users.map((user) => user.role))].sort()).toEqual(['AGENT', 'QUAI_PECHE', 'SERVICE_FINANCES']);
      const compte = (role) => ({ email: `${role.toLowerCase()}-${suffix}@kafountine.gouv.sn`, nom: 'A', prenom: 'B', role, password: 'MotDePasseSolide123!' });
      expect((await regisseur.post('/users', compte('ADMIN'))).status).toBe(400);
      expect((await regisseur.post('/users', compte('AGENT'))).status).toBe(201);
      const chef = await prisma.user.findUnique({ where: { email: 'superadmin@kafountine.gouv.sn' } });
      expect((await regisseur.put(`/users/${chef.id}`, { password: 'MotDePasseSolide123!' })).status).toBe(403);
      expect((await regisseur.get(`/budget/lignes?year=${year}`)).status).toBe(403);
      expect((await regisseur.get('/audit')).status).toBe(403);
    });
  });

  describe('listes paginées par le serveur', () => {
    const meta = (res) => res.body.meta;

    it('pagine les motos, recherche et isole les retards sur toute l’année', async () => {
      const page = await admin.get(`/motos?year=${year}&page=1&limit=2`);
      expect(page.status).toBe(200);
      expect(page.body.data.length).toBeLessThanOrEqual(2);
      expect(meta(page).total).toBeGreaterThanOrEqual(page.body.data.length);
      const retards = await admin.get(`/motos?year=${year}&page=1&limit=500&etat=retard`);
      expect(retards.body.data.every((moto) => moto.enRetard)).toBe(true);
      const ajour = await admin.get(`/motos?year=${year}&page=1&limit=500&etat=ajour`);
      expect(ajour.body.data.every((moto) => !moto.enRetard)).toBe(true);
      expect(meta(retards).total + meta(ajour).total).toBe(meta(page).total);
      const cible = page.body.data[0];
      const trouve = await admin.get(`/motos?year=${year}&page=1&limit=5&search=${encodeURIComponent(cible.matricule)}`);
      expect(trouve.body.data.map((moto) => moto.id)).toContain(cible.id);
    });

    it('sert les pages suivantes sans répéter de ligne', async () => {
      const first = await admin.get(`/motos/paiements?year=${year}&page=1&limit=2`);
      const second = await admin.get(`/motos/paiements?year=${year}&page=2&limit=2`);
      expect(meta(first).total).toBeGreaterThan(2);
      const ids = first.body.data.map((p) => p.id);
      for (const row of second.body.data) expect(ids).not.toContain(row.id);
    });

    it('compte les paiements du marché par statut, quel que soit le filtre', async () => {
      const all = await admin.get(`/marche/paiements?year=${year}&page=1&limit=1`);
      const paid = await admin.get(`/marche/paiements?year=${year}&page=1&limit=1&statut=PAYE`);
      expect(meta(paid).total).toBe(meta(all).counts.PAYE);
      expect(meta(paid).counts).toEqual(meta(all).counts);
      const details = await admin.get(`/marche/statistiques/details?year=${year}`);
      expect(details.status).toBe(200);
      expect(Array.isArray(details.body.data.topCommercants)).toBe(true);
      expect(details.body.data.topCommercants.length).toBeLessThanOrEqual(5);
    });

    it('filtre l’état civil par statut en base', async () => {
      const res = await admin.get(`/etat-civil?year=${year}&page=1&limit=500&statut=EN_ATTENTE`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((demande) => demande.statut === 'EN_ATTENTE')).toBe(true);
      expect(meta(res).total).toBe(res.body.data.length);
    });

    it.each(['pecheurs', 'embarcations', 'commissions', 'camions', 'expeditions'])('pagine %s avec ses compteurs', async (collection) => {
      const res = await admin.get(`/quai-peche/${collection}?year=${year}&page=1&limit=1`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(Object.values(meta(res).counts).reduce((a, b) => a + b, 0)).toBe(meta(res).total);
    });

    it('garde la liste complète quand aucune page n’est demandée', async () => {
      const res = await admin.get(`/quai-peche/pecheurs?year=${year}`);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeUndefined();
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
