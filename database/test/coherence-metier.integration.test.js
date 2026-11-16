// Cohérence métier : l'argent affiché, les droits de lecture, l'annulation et la clôture de caisse.
const request = require('supertest');
const { describeIntegration, login, origin, API_BASE_URL } = require('./helpers/session');

describeIntegration('cohérence métier', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const year = new Date().getFullYear();
  const motDePasse = `Coh-${suffix}-Aa1!x`;
  let superadmin; let admin; let agent; let regisseur; let finances; let quaipeche; let etatCivil;
  let contribuableId;
  let serie = 0;

  const fiche = () => {
    serie += 1;
    return {
      nin: `8${suffix}${serie}`.slice(0, 20), nom: 'Coherence', prenom: `Test${serie}`, dateNaiss: '1990-01-01',
      lieuNaiss: 'Kafountine', adresse: 'Kafountine', telephone: `76${Date.now().toString().slice(-6)}${serie}`,
    };
  };
  const nouveauContribuable = async () => (await admin.post('/contribuables').send(fiche())).body.data.id;
  const nouvelleMoto = async (proprietaireId) => {
    serie += 1;
    const res = await regisseur.post('/motos').send({ matricule: `C-${suffix}-${serie}`, marque: 'Jakarta', modele: 'C90', annee: 2020, proprietaireId });
    expect(res.status).toBe(201);
    return res.body.data;
  };
  const nouvellePlace = async (tarif = 3000) => {
    serie += 1;
    const res = await admin.post('/marche/places').send({ numeroPlace: `C${suffix}${serie}`, type: 'Table', zone: 'Nord', tarif, periode: 'mensuel', year });
    expect(res.status).toBe(201);
    return res.body.data;
  };
  const nouveauCompte = async (tag) => {
    const email = `${tag}-${suffix}@kafountine.gouv.sn`.toLowerCase();
    const created = await admin.post('/users').send({ email, nom: 'Caisse', prenom: tag, role: 'AGENT', password: motDePasse });
    expect(created.status).toBe(201);
    const session = request.agent(API_BASE_URL);
    expect((await session.post('/api/v1/auth/login').set('Origin', origin).send({ email, password: motDePasse })).status).toBe(200);
    const call = (method) => (path) => session[method](`/api/v1${path}`).set('Origin', origin);
    return { id: created.body.data.id, get: call('get'), post: call('post') };
  };
  const ticket = (compte, montant, modePaiement) => compte.post('/transactions').send({
    contribuableId, type: 'Taxe de test', service: 'Taxe de test', categorie: 'test', montant, modePaiement,
  });

  beforeAll(async () => {
    superadmin = await login('superadmin@kafountine.gouv.sn');
    // Le compte admin est en consultation seule : les écritures de préparation passent par le super administrateur.
    admin = superadmin;
    agent = await login('agent@kafountine.gouv.sn');
    regisseur = await login('regisseur@kafountine.gouv.sn');
    finances = await login('finances@kafountine.gouv.sn');
    quaipeche = await login('quaipeche@kafountine.gouv.sn');
    etatCivil = await login('etatcivil@kafountine.gouv.sn');
    contribuableId = await nouveauContribuable();
  });

  describe('recettes', () => {
    it('ventile les demandes d’état civil par type d’acte, en cohérence avec les totaux', async () => {
      const stats = (await admin.get(`/etat-civil/statistiques?year=${year}`)).body.data;
      const somme = (cle) => stats.parType.reduce((total, ligne) => total + ligne[cle], 0);
      expect(Array.isArray(stats.parType)).toBe(true);
      expect(somme('demandes')).toBe(stats.totalDemandes);
      expect(somme('delivrees')).toBe(stats.demandesDelivrees);
      expect(somme('recettes')).toBe(stats.recettes);
    });

    it('ne compte que les actes délivrés dans les recettes de l’état civil', async () => {
      const stats = async () => (await etatCivil.get(`/etat-civil/statistiques?year=${year}`)).body.data.recettes;
      const before = await stats();
      const types = (await etatCivil.get('/etat-civil/types-documents')).body.data;
      const base = { contribuableId, typeDocument: types[0].id, exemplaires: 1, montant: 1500 };
      expect((await etatCivil.post('/etat-civil').send({ ...base, statut: 'EN_ATTENTE' })).status).toBe(201);
      expect((await etatCivil.post('/etat-civil').send({ ...base, statut: 'REJETEE' })).status).toBe(201);
      expect(await stats()).toBe(before);
      expect((await etatCivil.post('/etat-civil').send({ ...base, statut: 'DELIVREE' })).status).toBe(201);
      expect(await stats()).toBe(before + 1500);
    });

    it('refuse de supprimer un acte délivré, mais accepte de supprimer une demande en attente', async () => {
      const types = (await etatCivil.get('/etat-civil/types-documents')).body.data;
      const base = { contribuableId, typeDocument: types[0].id, exemplaires: 1, montant: 700 };
      const delivre = (await etatCivil.post('/etat-civil').send({ ...base, statut: 'DELIVREE' })).body.data;
      expect((await etatCivil.delete(`/etat-civil/${delivre.id}`)).status).toBe(409);
      const attente = (await etatCivil.post('/etat-civil').send({ ...base, statut: 'EN_ATTENTE' })).body.data;
      expect((await etatCivil.delete(`/etat-civil/${attente.id}`)).status).toBe(200);
    });

    it('ne compte que les dossiers validés dans les recettes de l’urbanisme et protège leur suppression', async () => {
      const stats = async () => (await admin.get(`/urbanisme/statistiques?year=${year}`)).body.data.recettes;
      const before = await stats();
      const base = { contribuableId, type: 'autorisation-construire', montant: 9000 };
      const attente = await admin.post('/urbanisme').send({ ...base, statut: 'EN_ATTENTE' });
      expect(attente.status).toBe(201);
      expect(await stats()).toBe(before);
      const valide = await admin.put(`/urbanisme/${attente.body.data.id}`).send({ statut: 'VALIDE' });
      expect(valide.status).toBe(200);
      expect(await stats()).toBe(before + 9000);
      expect((await admin.delete(`/urbanisme/${attente.body.data.id}`)).status).toBe(409);
    });

    it('fait concorder le total du tableau de bord avec ses sources', async () => {
      const stats = (await admin.get(`/dashboard/statistiques?year=${year}`)).body.data;
      const sum = stats.recettesParSource.reduce((total, item) => total + item.montant, 0);
      expect(sum).toBeGreaterThan(0);
      expect(sum).toBeCloseTo(stats.recettesAnnee ?? stats.totalRecettes ?? sum, 2);
    });

    it('compte les tickets par jour, semaine et mois, et les motos en retard comme la page Motos', async () => {
      expect((await ticket(agent, 100, 'ESPECE')).status).toBe(201);
      const stats = (await admin.get(`/dashboard/statistiques?year=${year}`)).body.data;
      expect(stats.transactionsAujourdhui).toBeGreaterThanOrEqual(1);
      expect(stats.transactionsSemaine).toBeGreaterThanOrEqual(stats.transactionsAujourdhui);
      expect(stats.transactionsMois).toBeLessThanOrEqual(stats.totalTransactions);
      const motos = (await admin.get(`/motos/statistiques?year=${year}`)).body.data;
      expect(stats.stats.motos.enRetard).toBe(motos.enRetard);
    });
  });

  describe('annulations', () => {
    it('annule une cotisation moto, rétablit l’échéance et retire la recette', async () => {
      const moto = await nouvelleMoto(await nouveauContribuable());
      const stats = async () => (await admin.get(`/motos/statistiques?year=${year}`)).body.data.recettesAnnee;
      const paye = await agent.post('/motos/paiements').send({ motoId: moto.id, type: 'COTISATION' });
      expect(paye.status).toBe(201);
      const avant = await stats();
      const payeId = paye.body.data.id;
      expect((await agent.post(`/motos/paiements/${payeId}/annuler`).send({ motif: 'erreur de saisie' })).status).toBe(403);
      expect((await regisseur.post(`/motos/paiements/${payeId}/annuler`).send({})).status).toBe(400);
      expect((await regisseur.post(`/motos/paiements/${payeId}/annuler`).send({ motif: 'erreur de saisie' })).status).toBe(200);
      expect((await regisseur.post(`/motos/paiements/${payeId}/annuler`).send({ motif: 'deux fois' })).status).toBe(409);
      expect(await stats()).toBe(avant - paye.body.data.montant);
      const relue = (await admin.get(`/motos?search=${encodeURIComponent(moto.matricule)}`)).body.data.find((m) => m.id === moto.id);
      expect(new Date(relue.prochainPaiement).getTime()).toBe(new Date(moto.prochainPaiement).getTime());
    });

    it('exige d’annuler d’abord la cotisation la plus récente', async () => {
      const moto = await nouvelleMoto(await nouveauContribuable());
      const premiere = (await agent.post('/motos/paiements').send({ motoId: moto.id })).body.data;
      const seconde = (await agent.post('/motos/paiements').send({ motoId: moto.id })).body.data;
      expect((await regisseur.post(`/motos/paiements/${premiere.id}/annuler`).send({ motif: 'erreur' })).status).toBe(409);
      expect((await regisseur.post(`/motos/paiements/${seconde.id}/annuler`).send({ motif: 'erreur' })).status).toBe(200);
      expect((await regisseur.post(`/motos/paiements/${premiere.id}/annuler`).send({ motif: 'erreur' })).status).toBe(200);
    });

    it('fait avancer l’échéance mois par mois sur des paiements simultanés', async () => {
      const moto = await nouvelleMoto(await nouveauContribuable());
      const reponses = await Promise.all([1, 2, 3].map(() => agent.post('/motos/paiements').send({ motoId: moto.id })));
      expect(reponses.map((r) => r.status)).toEqual([201, 201, 201]);
      expect(new Set(reponses.map((r) => r.body.data.mois)).size).toBe(3);
    });

    it('numérote le reçu du marché côté serveur, ignore la date envoyée et permet de ré-encaisser après annulation', async () => {
      const place = await nouvellePlace();
      const periode = `Période ${suffix}`;
      const paye = await agent.post('/marche/paiements').send({ placeId: place.id, montant: 3000, periode, year, datePaiement: '2020-01-01', modePaiement: 'MOBILE_MONEY' });
      expect(paye.status).toBe(201);
      expect(paye.body.data.numeroRecu).toMatch(new RegExp(`^MAR-${year}-`));
      expect(paye.body.data.modePaiement).toBe('MOBILE_MONEY');
      expect(paye.body.data.datePaiement.startsWith(String(year))).toBe(true);
      expect((await agent.post('/marche/paiements').send({ placeId: place.id, montant: 3000, periode, year })).status).toBe(409);
      expect((await regisseur.post(`/marche/paiements/${paye.body.data.id}/annuler`).send({ motif: 'erreur de place' })).status).toBe(200);
      expect((await agent.post('/marche/paiements').send({ placeId: place.id, montant: 3000, periode, year })).status).toBe(201);
    });

    it('refuse à un agent un montant différent du tarif de la place', async () => {
      const place = await nouvellePlace(3000);
      expect((await agent.post('/marche/paiements').send({ placeId: place.id, montant: 10, periode: 'Mars', year })).status).toBe(400);
    });

    it('refuse à un agent de modifier l’échéance d’une moto', async () => {
      const moto = await nouvelleMoto(await nouveauContribuable());
      expect((await agent.put(`/motos/${moto.id}`).send({ prochainPaiement: '2030-01-10' })).status).toBe(403);
    });

    it('réserve l’adhésion et les changements d’une moto au régisseur', async () => {
      const proprietaireId = await nouveauContribuable();
      serie += 1;
      expect((await agent.post('/motos').send({ matricule: `C-${suffix}-${serie}`, marque: 'Jakarta', modele: 'C90', annee: 2020, proprietaireId })).status).toBe(403);
      const moto = await nouvelleMoto(proprietaireId);
      expect((await agent.put(`/motos/${moto.id}`).send({ couleur: 'Rouge' })).status).toBe(403);
      expect((await agent.post(`/motos/${moto.id}/changement-conducteur`).send({ conducteurId: proprietaireId })).status).toBe(403);
      expect((await regisseur.put(`/motos/${moto.id}`).send({ couleur: 'Rouge' })).status).toBe(200);
      expect((await agent.post('/motos/paiements').send({ motoId: moto.id })).status).toBe(201);
    });
  });

  describe('droits de lecture', () => {
    it('limite chaque liste aux rôles qui ont un écran', async () => {
      expect((await quaipeche.get('/transactions?limit=1')).status).toBe(403);
      expect((await quaipeche.get('/urbanisme')).status).toBe(403);
      expect((await quaipeche.get('/contribuables')).status).toBe(403);
      expect((await quaipeche.get('/motos?limit=1')).status).toBe(200);
      expect((await quaipeche.get('/marche/places')).status).toBe(200);
      expect((await agent.get('/quai-peche/pecheurs')).status).toBe(403);
      expect((await etatCivil.get('/motos?limit=1')).status).toBe(403);
      expect((await etatCivil.get('/marche/places')).status).toBe(403);
    });

    it('réserve l’encaissement moto et marché aux rôles qui ont l’écran', async () => {
      expect((await finances.post('/motos/paiements').send({})).status).toBe(403);
      expect((await finances.post('/marche/paiements').send({})).status).toBe(403);
    });
  });

  describe('caisse', () => {
    it('sépare les modes, exige d’expliquer un écart et verrouille la journée', async () => {
      const caissier = await nouveauCompte('Caissier');
      expect((await ticket(caissier, 1000, 'ESPECE')).status).toBe(201);
      expect((await ticket(caissier, 500, 'MOBILE_MONEY')).status).toBe(201);

      const journal = (await caissier.get('/caisse/journal')).body.data;
      expect(journal.total).toBe(1500);
      expect(journal.parMode).toEqual({ ESPECE: 1000, MOBILE_MONEY: 500 });
      expect(journal.cloture).toBeNull();

      expect((await caissier.post('/caisse/clotures').send({ montantCompte: 1400 })).status).toBe(400);
      const cloture = await caissier.post('/caisse/clotures').send({ montantCompte: 1400, observations: 'Il manque 100 FCFA' });
      expect(cloture.status).toBe(201);
      expect(cloture.body.data).toMatchObject({ montantAttendu: 1500, montantCompte: 1400, ecart: -100, statut: 'CLOTUREE' });

      expect((await caissier.post('/caisse/clotures').send({ montantCompte: 1500 })).status).toBe(409);
      expect((await ticket(caissier, 200, 'ESPECE')).status).toBe(409);

      expect((await regisseur.post(`/caisse/clotures/${cloture.body.data.id}/rouvrir`).send({ motif: 'recomptage' })).status).toBe(200);
      expect((await ticket(caissier, 200, 'ESPECE')).status).toBe(201);
    });

    it('cloisonne la caisse et interdit de valider la sienne', async () => {
      const un = await nouveauCompte('Un');
      const deux = await nouveauCompte('Deux');
      expect((await un.get(`/caisse/journal?agentId=${deux.id}`)).status).toBe(403);
      expect((await un.get('/caisse/synthese')).status).toBe(403);
      expect((await regisseur.get(`/caisse/journal?agentId=${deux.id}`)).status).toBe(200);

      const cloture = (await un.post('/caisse/clotures').send({ montantCompte: 0 })).body.data;
      expect((await un.post(`/caisse/clotures/${cloture.id}/valider`)).status).toBe(403);
      expect((await regisseur.post(`/caisse/clotures/${cloture.id}/valider`)).status).toBe(200);
      expect((await regisseur.post(`/caisse/clotures/${cloture.id}/rouvrir`).send({ motif: 'trop tard' })).status).toBe(409);

      const synthese = (await regisseur.get('/caisse/synthese')).body.data;
      expect(synthese.agents.find((a) => a.agentId === un.id).cloture.statut).toBe('VALIDEE');
    });

    it('laisse l’état civil hors de la vue du régisseur, pas de celle de l’administration', async () => {
      const types = (await etatCivil.get('/etat-civil/types-documents')).body.data;
      expect((await etatCivil.post('/etat-civil').send({ contribuableId, typeDocument: types[0].id, exemplaires: 1, montant: 900, statut: 'DELIVREE' })).status).toBe(201);
      const propre = (await etatCivil.get('/caisse/journal')).body.data;
      expect(propre.parSource['État civil']).toBeGreaterThanOrEqual(900);

      const vueRegisseur = (await regisseur.get(`/caisse/journal?agentId=${propre.agentId}`)).body.data;
      expect(vueRegisseur.lignes.some((l) => l.source === 'État civil')).toBe(false);
      const syntheseRegisseur = (await regisseur.get('/caisse/synthese')).body.data;
      expect(syntheseRegisseur.agents.some((a) => a.agentId === propre.agentId)).toBe(false);
      expect((await regisseur.post('/caisse/clotures').send({ agentId: propre.agentId, montantCompte: 0, observations: 'test' })).status).toBe(403);

      const syntheseAdmin = (await superadmin.get('/caisse/synthese')).body.data;
      expect(syntheseAdmin.agents.find((a) => a.agentId === propre.agentId).montant).toBe(propre.total);
    });
  });

  describe('actes d’état civil', () => {
    it('refuse les actes en ticket, quelle que soit leur écriture', async () => {
      for (const categorie of ['etat-civil', 'État civil', 'ETAT_CIVIL']) {
        const res = await agent.post('/transactions').send({ contribuableId, categorie, type: categorie, service: 'Acte', montant: 300 });
        expect(res.status).toBe(400);
      }
      expect((await etatCivil.post('/transactions').send({ contribuableId, categorie: 'test', type: 'test', montant: 300 })).status).toBe(403);
    });

    it('garde les anciens tickets lisibles', async () => {
      expect((await etatCivil.get('/transactions?limit=5')).status).toBe(200);
    });
  });

  describe('loyers du marché', () => {
    const occupee = async (periode, tarif = 4000) => {
      serie += 1;
      const res = await admin.post('/marche/places').send({
        numeroPlace: `L${suffix}${serie}`, type: 'Table', zone: 'Sud', tarif, periode, year, statut: 'OCCUPEE', occupantId: await nouveauContribuable(),
      });
      expect(res.status).toBe(201);
      return res.body.data;
    };
    const lignes = async (place) => (await admin.get(`/marche/paiements?year=${year}&page=1&limit=20&search=${place.numeroPlace}`)).body.data;
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const courant = () => `${mois[new Date().getUTCMonth()]} ${new Date().getUTCFullYear()}`;

    it('crée un seul loyer dû pour la période et l’encaisse sans doublon', async () => {
      const place = await occupee('mois');
      const dus = await lignes(place);
      expect(dus).toHaveLength(1);
      expect(dus[0]).toMatchObject({ statut: 'EN_ATTENTE', periode: courant(), montant: 4000 });
      expect((await admin.put(`/marche/places/${place.id}`).send({ activite: 'Légumes' })).status).toBe(200);
      expect(await lignes(place)).toHaveLength(1);

      const impayes = async () => (await admin.get('/impayes?limit=1000')).body.data.lignes.filter((l) => l.id === dus[0].id);
      expect(await impayes()).toHaveLength(1);
      expect((await agent.post('/marche/paiements').send({ placeId: place.id, montant: 4000, periode: courant(), year })).status).toBe(201);
      const apres = await lignes(place);
      expect(apres).toHaveLength(1);
      expect(apres[0].statut).toBe('PAYE');
      expect(await impayes()).toHaveLength(0);
    });

    it('applique le rythme de la place et ignore une place libre', async () => {
      const annuelle = await occupee('annee', 50000);
      expect((await lignes(annuelle))[0]).toMatchObject({ periode: `Année ${year}`, montant: 50000 });
      const libre = await nouvellePlace();
      expect(await lignes(libre)).toHaveLength(0);
    });
  });

  describe('recouvrement', () => {
    it('présente la situation d’un contribuable et cloisonne l’état civil', async () => {
      const id = await nouveauContribuable();
      await nouvelleMoto(id);
      const types = (await etatCivil.get('/etat-civil/types-documents')).body.data;
      await etatCivil.post('/etat-civil').send({ contribuableId: id, typeDocument: types[0].id, exemplaires: 1, montant: 700, statut: 'DELIVREE' });

      const vu = (await superadmin.get(`/contribuables/${id}/situation?year=${year}`)).body.data;
      expect(vu.parSource['Motos']).toBeGreaterThan(0);
      expect(vu.parSource['État civil']).toBe(700);

      const masque = (await regisseur.get(`/contribuables/${id}/situation?year=${year}`)).body.data;
      expect(masque.parSource['État civil']).toBeUndefined();
      expect(masque.totalPaye).toBe(vu.totalPaye - 700);
      expect((await quaipeche.get(`/contribuables/${id}/situation?year=${year}`)).status).toBe(403);
    });

    it('liste les loyers impayés sans compter ceux qui sont payés ou annulés', async () => {
      const place = await nouvellePlace();
      const periode = `Impayé ${suffix}`;
      expect((await admin.post('/marche/paiements').send({ placeId: place.id, montant: 3000, periode, statut: 'EN_ATTENTE', year })).status).toBe(201);
      const impayes = (await admin.get('/impayes?limit=1000')).body.data;
      expect(impayes.lignes.some((l) => l.type === 'MARCHE' && l.libelle.includes(periode))).toBe(true);
      expect(impayes.total).toBe(impayes.montantMotos + impayes.montantMarche);
      expect((await etatCivil.get('/impayes')).status).toBe(403);
    });
  });
});
