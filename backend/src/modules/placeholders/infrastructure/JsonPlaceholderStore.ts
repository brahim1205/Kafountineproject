import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';

type FormationRecord = {
  id: string;
  nom: string;
  domaine: string;
  duree: string;
  responsable: string;
  budget: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  year?: number;
  createdAt: string;
  updatedAt: string;
};

type JeuneRecord = {
  id: string;
  nom: string;
  prenom: string;
  cni: string;
  telephone: string;
  adresse?: string;
  niveauEtude?: string;
  sexe?: string;
  dateNaiss?: string;
  year?: number;
  photo?: string;
  formations: Array<{
    formationId: string;
    dateInscription: string;
    tauxAssiduite: number;
    statutFinal: string;
    presences: number;
    absences: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

type GenericRecord = Record<string, any> & {
  id: string;
  year?: number;
  createdAt: string;
  updatedAt: string;
};

type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  titre: string;
  message: string;
  montant: number | null;
  contribuable: string | null;
  agent: string | null;
  lu: boolean;
  timestamp: string;
};

type PlaceholderDatabase = {
  budgetLignes: GenericRecord[];
  budgetDemandes: GenericRecord[];
  formations: FormationRecord[];
  jeunes: JeuneRecord[];
  etatCivil: GenericRecord[];
  urbanisme: GenericRecord[];
  marchePlaces: GenericRecord[];
  marchePayments: GenericRecord[];
  motos: GenericRecord[];
  motoPayments: GenericRecord[];
  notifications: GenericRecord[];
  users: GenericRecord[];
  pecheurs: GenericRecord[];
  embarcations: GenericRecord[];
  commissions: GenericRecord[];
  camions: GenericRecord[];
  expeditions: GenericRecord[];
  settingsTarifs: GenericRecord[];
  settingsPenalites: GenericRecord[];
  settingsPermissions: GenericRecord[];
  backups: GenericRecord[];
};

const DEFAULT_DB: PlaceholderDatabase = {
  budgetLignes: [],
  budgetDemandes: [],
  formations: [],
  jeunes: [],
  etatCivil: [],
  urbanisme: [],
  marchePlaces: [],
  marchePayments: [],
  motos: [],
  motoPayments: [],
  notifications: [],
  users: [],
  pecheurs: [],
  embarcations: [],
  commissions: [],
  camions: [],
  expeditions: [],
  settingsTarifs: [],
  settingsPenalites: [],
  settingsPermissions: [],
  backups: [],
};

export class JsonPlaceholderStore {
  private readonly dataFile = path.resolve(process.cwd(), 'data', 'placeholder-store.json');

  async listFormations(year?: number) {
    const db = await this.read();
    return db.formations.filter((item) => !year || Number(item.year) === year);
  }

  async createFormation(payload: Record<string, unknown>) {
    const db = await this.read();
    const now = new Date().toISOString();
    const created: FormationRecord = {
      id: randomUUID(),
      nom: String(payload.nom || ''),
      domaine: String(payload.domaine || ''),
      duree: String(payload.duree || ''),
      responsable: String(payload.responsable || ''),
      budget: Number(payload.budget || 0),
      dateDebut: String(payload.dateDebut || now),
      dateFin: String(payload.dateFin || now),
      statut: String(payload.statut || 'PLANIFIEE'),
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
      createdAt: now,
      updatedAt: now,
    };
    db.formations.push(created);
    await this.write(db);
    return this.decorateFormation(created, db);
  }

  async updateFormation(id: string, payload: Record<string, unknown>) {
    const db = await this.read();
    const index = db.formations.findIndex((item) => item.id === id);
    if (index === -1) return null;
    db.formations[index] = {
      ...db.formations[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    } as FormationRecord;
    await this.write(db);
    return this.decorateFormation(db.formations[index], db);
  }

  async deleteFormation(id: string) {
    const db = await this.read();
    db.formations = db.formations.filter((item) => item.id !== id);
    db.jeunes = db.jeunes.map((jeune) => ({
      ...jeune,
      formations: jeune.formations.filter((entry) => entry.formationId !== id),
      updatedAt: new Date().toISOString(),
    }));
    await this.write(db);
  }

  async listJeunes(year?: number, search?: string, limit?: number) {
    const db = await this.read();
    let jeunes = db.jeunes.filter((item) => !year || Number(item.year) === year);
    if (search) {
      const normalized = search.toLowerCase();
      jeunes = jeunes.filter((item) =>
        [item.nom, item.prenom, item.cni, item.telephone].some((value) => String(value || '').toLowerCase().includes(normalized))
      );
    }
    if (limit) {
      jeunes = jeunes.slice(0, limit);
    }
    return jeunes;
  }

  async createJeune(payload: Record<string, unknown>) {
    const db = await this.read();
    const now = new Date().toISOString();
    const created: JeuneRecord = {
      id: randomUUID(),
      nom: String(payload.nom || ''),
      prenom: String(payload.prenom || ''),
      cni: String(payload.cni || ''),
      telephone: String(payload.telephone || ''),
      adresse: payload.adresse ? String(payload.adresse) : '',
      niveauEtude: payload.niveauEtude ? String(payload.niveauEtude) : '',
      sexe: payload.sexe ? String(payload.sexe) : '',
      dateNaiss: payload.dateNaiss ? String(payload.dateNaiss) : '',
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
      photo: payload.photo ? String(payload.photo) : '',
      formations: [],
      createdAt: now,
      updatedAt: now,
    };
    db.jeunes.push(created);
    await this.write(db);
    return created;
  }

  async deleteJeune(id: string) {
    const db = await this.read();
    db.jeunes = db.jeunes.filter((item) => item.id !== id);
    await this.write(db);
  }

  async inscrireJeuneFormation(jeuneId: string, formationId: string) {
    const db = await this.read();
    const jeune = db.jeunes.find((item) => item.id === jeuneId);
    if (!jeune) return null;
    if (!jeune.formations.some((entry) => entry.formationId === formationId)) {
      jeune.formations.push({
        formationId,
        dateInscription: new Date().toISOString(),
        tauxAssiduite: 0,
        statutFinal: 'En cours',
        presences: 0,
        absences: 0,
      });
      jeune.updatedAt = new Date().toISOString();
      await this.write(db);
    }
    return jeune;
  }

  async getFormationStats(year?: number) {
    const db = await this.read();
    const formations = db.formations.filter((item) => !year || Number(item.year) === year);
    const jeunes = db.jeunes.filter((item) => !year || Number(item.year) === year);
    const totalJeunesFormes = jeunes.filter((item) => item.formations.length > 0).length;
    const totalCertifies = jeunes.filter((item) =>
      item.formations.some((entry) => ['CERTIFIE', 'Certifié', 'Terminé'].includes(entry.statutFinal))
    ).length;
    const budgetTotal = formations.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const repartitionDomaines = this.toDistribution(
      formations.map((item) => item.domaine || 'Autre'),
      'domaine'
    );
    const repartitionSexe = this.toDistribution(
      jeunes.map((item) => this.toSexeLabel(item.sexe || '')),
      'sexe'
    );
    const evolutionAnnuelle = Array.from(
      jeunes.reduce((acc, item) => {
        const key = String(item.year || new Date(item.createdAt).getFullYear());
        acc.set(key, (acc.get(key) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).map(([annee, nombre]) => ({ annee, nombre }));

    return {
      totalFormations: formations.length,
      formationsEnCours: formations.filter((item) => item.statut === 'EN_COURS').length,
      formationsTerminees: formations.filter((item) => item.statut === 'TERMINEE').length,
      totalJeunesFormes,
      totalCertifies,
      tauxReussiteGlobal: totalJeunesFormes > 0 ? Math.round((totalCertifies / totalJeunesFormes) * 100) : 0,
      budgetTotal,
      repartitionDomaines,
      repartitionSexe,
      evolutionAnnuelle,
    };
  }

  async listCollection(collection: keyof PlaceholderDatabase, options?: { year?: number; search?: string; limit?: number }): Promise<any[]> {
    const db = await this.read();
    let items: any[] = [...(db[collection] as any[])];
    if (options?.year) {
      items = items.filter((item) => !item.year || Number(item.year) === options.year);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      items = items.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search)
      );
    }
    if (options?.limit) {
      items = items.slice(0, options.limit);
    }
    return items;
  }

  async getCollectionItem(collection: keyof PlaceholderDatabase, id: string): Promise<any | null> {
    const db = await this.read();
    return (db[collection] as any[]).find((item: any) => item.id === id) || null;
  }

  async createCollectionItem(collection: keyof PlaceholderDatabase, payload: Record<string, unknown>): Promise<any> {
    const db = await this.read();
    const now = new Date().toISOString();
    const item: GenericRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...payload,
    };
    (db[collection] as any[]).push(item);
    await this.write(db);
    return item;
  }

  async updateCollectionItem(collection: keyof PlaceholderDatabase, id: string, payload: Record<string, unknown>): Promise<any | null> {
    const db = await this.read();
    const items = db[collection] as any[];
    const index = items.findIndex((item: any) => item.id === id);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...payload,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.write(db);
    return items[index];
  }

  async deleteCollectionItem(collection: keyof PlaceholderDatabase, id: string) {
    const db = await this.read();
    const items = (db[collection] as any[]).filter((item: any) => item.id !== id);
    (db as any)[collection] = items;
    await this.write(db);
  }

  async listUrbanisme(year?: number) {
    return this.listCollection('urbanisme', { year });
  }

  async createUrbanisme(payload: Record<string, unknown>) {
    const contribuable = payload.contribuableId ? await prisma.contribuable.findUnique({ where: { id: String(payload.contribuableId) } }) : null;
    return this.createCollectionItem('urbanisme', {
      numero: `URB-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      statut: 'EN_ATTENTE',
      montant: Number(payload.montant || payload.surface ? Number(payload.surface || 1) * 5000 : 0),
      demandeurNom: contribuable ? `${contribuable.prenom} ${contribuable.nom}`.trim() : '',
      demandeurTelephone: contribuable?.telephone || '',
      demandeurAdresse: contribuable?.adresse || '',
      ...payload,
    });
  }

  async getUrbanismeStats(year?: number) {
    const dossiers = await this.listUrbanisme(year);
    return {
      total: dossiers.length,
      enAttente: dossiers.filter((item) => item.statut === 'EN_ATTENTE').length,
      valide: dossiers.filter((item) => item.statut === 'VALIDE').length,
      rejete: dossiers.filter((item) => item.statut === 'REJETE').length,
      montantTotal: dossiers.reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  async listEtatCivil(year?: number) {
    const demandes = await this.listCollection('etatCivil', { year });
    return Promise.all(
      demandes.map(async (demande: any) => {
        const contribuable = demande.contribuableId
          ? await prisma.contribuable.findUnique({ where: { id: String(demande.contribuableId) } })
          : null;
        return {
          ...demande,
          contribuable: contribuable
            ? {
                id: contribuable.id,
                nom: contribuable.nom,
                prenom: contribuable.prenom,
                nin: contribuable.nin,
                telephone: contribuable.telephone,
              }
            : null,
          date: demande.createdAt,
        };
      })
    );
  }

  async createEtatCivil(payload: Record<string, unknown>) {
    const contribuable = payload.contribuableId
      ? await prisma.contribuable.findUnique({ where: { id: String(payload.contribuableId) } })
      : null;
    const exemplaires = Number(payload.exemplaires || 1);
    const typeDocument = String(payload.typeDocument || '');
    const unitPrice =
      typeDocument === 'extrait-naissance'
        ? 500
        : typeDocument === 'certificat-residence'
          ? 1000
          : typeDocument === 'certificat-vie'
            ? 500
            : 1000;
    return this.createCollectionItem('etatCivil', {
      numero: `EC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      statut: 'DELIVREE',
      montant: Number(payload.montant || unitPrice * exemplaires),
      typeDocument,
      exemplaires,
      agent: 'Agent État Civil',
      demandeurNom: contribuable ? `${contribuable.prenom} ${contribuable.nom}`.trim() : '',
      ...payload,
    });
  }

  async getEtatCivilStats(year?: number) {
    const demandes = await this.listEtatCivil(year);
    return {
      totalDemandes: demandes.length,
      demandesEnAttente: demandes.filter((item) => item.statut === 'EN_ATTENTE').length,
      demandesDelivrees: demandes.filter((item) => item.statut === 'DELIVREE').length,
      demandesRejetees: demandes.filter((item) => item.statut === 'REJETEE').length,
      recettes: demandes.reduce((sum, item) => sum + Number(item.montant || 0), 0),
    };
  }

  async listPlacesMarche(year?: number) {
    const places = await this.listCollection('marchePlaces', { year });
    return Promise.all(places.map((place) => this.enrichPlace(place)));
  }

  async createPlaceMarche(payload: Record<string, unknown>) {
    const created = await this.createCollectionItem('marchePlaces', {
      numero: payload.numeroPlace || payload.numero || `PLC-${Date.now()}`,
      type: payload.type || 'Place de marché',
      zone: payload.zone || '',
      occupantId: payload.occupantId || null,
      activite: payload.activite || '',
      tarif: Number(payload.tarif || 0),
      periode: payload.periode || 'mensuel',
      statut: payload.statut || 'LIBRE',
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
    });
    return this.enrichPlace(created);
  }

  async updatePlaceMarche(id: string, payload: Record<string, unknown>) {
    const updated = await this.updateCollectionItem('marchePlaces', id, payload);
    return updated ? this.enrichPlace(updated) : null;
  }

  async listPaiementsMarche(year?: number) {
    const payments = await this.listCollection('marchePayments', { year });
    const places = await this.listPlacesMarche(year);
    return payments.map((payment) => ({
      ...payment,
      place: places.find((place) => place.id === payment.placeId) || null,
    }));
  }

  async createPaiementMarche(payload: Record<string, unknown>) {
    return this.createCollectionItem('marchePayments', {
      numero: `PM-${Date.now()}`,
      datePaiement: new Date().toISOString(),
      montant: Number(payload.montant || 0),
      statut: 'PAYE',
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
      ...payload,
    });
  }

  async getMarcheStats(year?: number) {
    const [places, paiements] = await Promise.all([
      this.listPlacesMarche(year),
      this.listPaiementsMarche(year),
    ]);
    const placesTotales = places.length;
    const placesOccupees = (places as any[]).filter((item: any) => item.statut === 'OCCUPEE').length;
    return {
      recettesMois: (paiements as any[]).reduce((sum, item: any) => sum + Number(item.montant || 0), 0),
      placesTotales,
      placesOccupees,
      tauxOccupation: placesTotales > 0 ? Math.round((placesOccupees / placesTotales) * 100) : 0,
      nouveauxCommercants: (places as any[]).filter((item: any) => item.occupantId).length,
      recettesEnRetard: (paiements as any[]).filter((item: any) => item.statut !== 'PAYE').reduce((sum, item: any) => sum + Number(item.montant || 0), 0),
    };
  }

  async listMotos(year?: number, search?: string, limit?: number) {
    const motos = await this.listCollection('motos', { year, search, limit });
    return Promise.all(motos.map((moto) => this.enrichMoto(moto)));
  }

  async createMoto(payload: Record<string, unknown>) {
    const created = await this.createCollectionItem('motos', {
      ...payload,
      statut: payload.statut || 'ACTIVE',
      year: payload.annee ? Number(payload.annee) : new Date().getFullYear(),
      enRetard: false,
      montantPenalite: 250,
    });
    return this.enrichMoto(created);
  }

  async updateMoto(id: string, payload: Record<string, unknown>) {
    const updated = await this.updateCollectionItem('motos', id, payload);
    return updated ? this.enrichMoto(updated) : null;
  }

  async changeMotoDriver(id: string, payload: Record<string, unknown>) {
    return this.updateMoto(id, {
      conducteurId: payload.conducteurId,
      permis: payload.permis,
    });
  }

  async listMotoPayments(year?: number) {
    const payments = await this.listCollection('motoPayments', { year });
    const motos = await this.listMotos(year);
    return payments.map((payment) => ({
      ...payment,
      moto: motos.find((moto) => moto.id === payment.motoId) || null,
    }));
  }

  async createMotoPayment(payload: Record<string, unknown>) {
    const moto = await this.getCollectionItem('motos', String(payload.motoId));
    const now = new Date().toISOString();
    const created = await this.createCollectionItem('motoPayments', {
      motoId: payload.motoId,
      numeroRecu: `MOTO-${Date.now()}`,
      datePaiement: now,
      mois: payload.mois || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      montant: Number(payload.montant || ((moto?.enRetard ? 1250 : 1000))),
      statut: 'PAYE',
      agent: 'Agent Municipal',
      year: payload.year ? Number(payload.year) : new Date().getFullYear(),
    });
    if (moto) {
      await this.updateCollectionItem('motos', String(payload.motoId), { enRetard: false });
    }
    return created;
  }

  async getMotoStats(year?: number) {
    const [motos, payments] = await Promise.all([this.listMotos(year), this.listMotoPayments(year)]);
    return {
      totalMotos: motos.length,
      paiementsMois: payments.length,
      enRetard: (motos as any[]).filter((moto: any) => moto.enRetard).length,
      recettesMois: (payments as any[]).reduce((sum, item: any) => sum + Number(item.montant || 0), 0),
      total: motos.length,
      actives: (motos as any[]).filter((moto: any) => moto.statut === 'ACTIVE').length,
      recettesTotal: (payments as any[]).reduce((sum, item: any) => sum + Number(item.montant || 0), 0),
    };
  }

  async getMotoConfiguration() {
    return {
      tarifMensuel: 1000,
      penaliteRetard: 250,
    };
  }

  async getQuaiPecheStats() {
    const db = await this.read();
    return {
      totalCommissions: db.commissions.length,
      totalPoids: db.commissions.reduce((sum, item) => sum + Number(item.poids || 0), 0),
      commissionsEnAttente: db.commissions.filter((item) => item.statut === 'EN_ATTENTE').length,
      totalPecheurs: db.pecheurs.length,
      totalEmbarcations: db.embarcations.length,
    };
  }

  async listNotifications(limit?: number): Promise<NotificationRecord[]> {
    const notifications = await this.listCollection('notifications', { limit });
    if (notifications.length === 0) {
      await this.seedNotifications();
      return this.listNotifications(limit);
    }
    return notifications.map((item: any) => ({
      id: item.id,
      userId: String(item.userId || 'system'),
      type: String(item.type || 'info'),
      titre: String(item.titre || 'Notification'),
      message: String(item.message || ''),
      montant: item.montant ? Number(item.montant) : null,
      contribuable: item.contribuable ? String(item.contribuable) : null,
      agent: item.agent ? String(item.agent) : null,
      lu: Boolean(item.lu),
      timestamp: String(item.timestamp || item.createdAt),
    }));
  }

  async markNotificationRead(id: string) {
    return this.updateCollectionItem('notifications', id, { lu: true });
  }

  async markAllNotificationsRead() {
    const db = await this.read();
    db.notifications = db.notifications.map((item) => ({
      ...item,
      lu: true,
      updatedAt: new Date().toISOString(),
    }));
    await this.write(db);
  }

  async listUsers(search?: string) {
    return prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(payload: Record<string, unknown>) {
    const password = await bcrypt.hash(String(payload.password || 'password123'), 10);
    return prisma.user.create({
      data: {
        email: String(payload.email || ''),
        password,
        nom: String(payload.nom || ''),
        prenom: String(payload.prenom || ''),
        role: String(payload.role || 'AGENT'),
        telephone: payload.telephone ? String(payload.telephone) : null,
        isActive: true,
      },
    });
  }

  async updateUser(id: string, payload: Record<string, unknown>) {
    const data: Record<string, unknown> = {
      ...(payload.email ? { email: String(payload.email) } : {}),
      ...(payload.nom ? { nom: String(payload.nom) } : {}),
      ...(payload.prenom ? { prenom: String(payload.prenom) } : {}),
      ...(payload.role ? { role: String(payload.role) } : {}),
      ...(payload.telephone !== undefined ? { telephone: payload.telephone ? String(payload.telephone) : null } : {}),
      ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {}),
    };
    if (payload.password) {
      data.password = await bcrypt.hash(String(payload.password), 10);
    }
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    await prisma.user.delete({ where: { id } });
  }

  async getTarifs(): Promise<GenericRecord[]> {
    const db = await this.read();
    if (db.settingsTarifs.length === 0) {
      await this.seedSettings();
      return this.getTarifs();
    }
    return db.settingsTarifs;
  }

  async getPenalites(): Promise<GenericRecord[]> {
    const db = await this.read();
    if (db.settingsPenalites.length === 0) {
      await this.seedSettings();
      return this.getPenalites();
    }
    return db.settingsPenalites;
  }

  async getPermissions(): Promise<GenericRecord[]> {
    const db = await this.read();
    if (db.settingsPermissions.length === 0) {
      await this.seedSettings();
      return this.getPermissions();
    }
    return db.settingsPermissions;
  }

  async createBackupRecord() {
    const timestamp = new Date().toISOString();
    const filename = `backup-${timestamp.replace(/[:.]/g, '-')}.json`;
    return this.createCollectionItem('backups', {
      filename,
      size: 0,
      createdAt: timestamp,
    });
  }

  async seedSettings() {
    const db = await this.read();
    if (db.settingsTarifs.length === 0) {
      db.settingsTarifs = [
        { id: randomUUID(), categorie: 'etat-civil', nom: 'Extrait de naissance', montant: 500, unite: 'document', description: '', actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: randomUUID(), categorie: 'urbanisme', nom: 'Permis de construire', montant: 5000, unite: 'm²', description: '', actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: randomUUID(), categorie: 'marche', nom: 'Place de marché', montant: 5000, unite: 'mois', description: '', actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
    }
    if (db.settingsPenalites.length === 0) {
      db.settingsPenalites = [
        { id: randomUUID(), type: 'retard-moto', description: 'Retard paiement moto', montant: 250, delai: '30 jours', actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
    }
    if (db.settingsPermissions.length === 0) {
      db.settingsPermissions = [
        { id: randomUUID(), module: 'contribuables', agent: true, superviseur: true, comptable: false, admin: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: randomUUID(), module: 'transactions', agent: true, superviseur: true, comptable: true, admin: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: randomUUID(), module: 'parametres', agent: false, superviseur: false, comptable: false, admin: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
    }
    await this.write(db);
  }

  async seedNotifications() {
    const db = await this.read();
    if (db.notifications.length > 0) return;
    db.notifications = [
      {
        id: randomUUID(),
        userId: 'system',
        type: 'payment',
        titre: 'Paiement reçu',
        message: 'Une nouvelle transaction a été enregistrée.',
        montant: 1000,
        contribuable: 'Contribuable Test',
        agent: 'Mamadou Diallo',
        lu: false,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await this.write(db);
  }

  async createQuaiResource(collection: 'pecheurs' | 'embarcations' | 'commissions' | 'camions' | 'expeditions', payload: Record<string, unknown>) {
    const now = new Date().toISOString();
    const defaults: Record<string, any> = {
      pecheurs: { statut: 'ACTIF' },
      embarcations: { statut: 'ACTIVE' },
      commissions: { statut: 'EN_ATTENTE', numero: `CF-${Date.now()}`, date: now },
      camions: { statut: 'ACTIF' },
      expeditions: { statut: 'EN_PREPARATION', numero: `EXP-${Date.now()}`, date: now },
    };
    return this.createCollectionItem(collection, { ...defaults[collection], ...payload });
  }

  private async enrichPlace(place: GenericRecord): Promise<any> {
    const occupant = place.occupantId ? await prisma.contribuable.findUnique({ where: { id: String(place.occupantId) } }) : null;
    return {
      ...place,
      numero: place.numero || place.numeroPlace,
      occupantId: occupant
        ? {
            id: occupant.id,
            nom: occupant.nom,
            prenom: occupant.prenom,
            telephone: occupant.telephone,
            nin: occupant.nin,
          }
        : null,
    };
  }

  private async enrichMoto(moto: GenericRecord): Promise<any> {
    const [proprietaire, conducteur] = await Promise.all([
      moto.proprietaireId ? prisma.contribuable.findUnique({ where: { id: String(moto.proprietaireId) } }) : Promise.resolve(null),
      moto.conducteurId ? prisma.contribuable.findUnique({ where: { id: String(moto.conducteurId) } }) : Promise.resolve(null),
    ]);

    return {
      ...moto,
      proprietaire: proprietaire
        ? { id: proprietaire.id, nom: proprietaire.nom, prenom: proprietaire.prenom, nin: proprietaire.nin }
        : null,
      conducteur: conducteur
        ? { id: conducteur.id, nom: conducteur.nom, prenom: conducteur.prenom, nin: conducteur.nin }
        : null,
    };
  }

  private decorateFormation(formation: FormationRecord, db: PlaceholderDatabase) {
    const inscriptions = db.jeunes.flatMap((jeune) => jeune.formations.filter((entry) => entry.formationId === formation.id));
    const certifies = inscriptions.filter((entry) => ['CERTIFIE', 'Certifié', 'Terminé'].includes(entry.statutFinal)).length;
    return {
      ...formation,
      nombreInscrits: inscriptions.length,
      nombreCertifies: certifies,
      tauxReussite: inscriptions.length > 0 ? Math.round((certifies / inscriptions.length) * 100) : 0,
    };
  }

  private toDistribution(items: string[], key: string) {
    const total = items.length;
    const grouped = items.reduce((acc, item) => {
      const normalized = item || 'Non renseigné';
      acc.set(normalized, (acc.get(normalized) || 0) + 1);
      return acc;
    }, new Map<string, number>());

    return Array.from(grouped.entries()).map(([label, nombre]) => ({
      [key]: label,
      nombre,
      pourcentage: total > 0 ? Math.round((nombre / total) * 100) : 0,
    }));
  }

  private toSexeLabel(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.startsWith('m')) return 'Hommes';
    if (normalized.startsWith('f')) return 'Femmes';
    return 'Non renseigné';
  }

  // ─── BUDGET ──────────────────────────────────────────────
  async listBudgetLignes(year?: number) {
    const db = await this.read();
    return db.budgetLignes.filter((item) => !year || Number(item.year) === year);
  }

  async createBudgetLigne(payload: Record<string, unknown>) {
    const db = await this.read();
    const now = new Date().toISOString();
    const created = {
      id: randomUUID(),
      code: String(payload.code || ''),
      libelle: String(payload.libelle || ''),
      description: payload.description ? String(payload.description) : null,
      prevu: Number(payload.prevu || 0),
      depense: Number(payload.depense || 0),
      year: Number(payload.year || new Date().getFullYear()),
      createdAt: now,
      updatedAt: now,
    };
    db.budgetLignes.push(created);
    await this.write(db);
    return created;
  }

  async updateBudgetLigne(id: string, payload: Record<string, unknown>) {
    const db = await this.read();
    const index = db.budgetLignes.findIndex((item) => item.id === id);
    if (index === -1) return null;
    db.budgetLignes[index] = {
      ...db.budgetLignes[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    await this.write(db);
    return db.budgetLignes[index];
  }

  async deleteBudgetLigne(id: string) {
    const db = await this.read();
    db.budgetLignes = db.budgetLignes.filter((item) => item.id !== id);
    await this.write(db);
  }

  async getBudgetStats(year?: number) {
    const lignes = await this.listBudgetLignes(year);
    const totalPrevu = lignes.reduce((sum, l) => sum + Number(l.prevu || 0), 0);
    const totalDepense = lignes.reduce((sum, l) => sum + Number(l.depense || 0), 0);
    const demandes = await this.listBudgetDemandes(year);
    return {
      totalPrevu,
      totalDepense,
      totalReste: totalPrevu - totalDepense,
      tauxExecution: totalPrevu > 0 ? Math.round((totalDepense / totalPrevu) * 100) : 0,
      nombreLignes: lignes.length,
      demandesEnAttente: demandes.filter((d) => d.statut === 'EN_ATTENTE').length,
      demandesApprouvees: demandes.filter((d) => d.statut === 'APPROUVE').length,
      demandesRejetees: demandes.filter((d) => d.statut === 'REJETE').length,
    };
  }

  async listBudgetDemandes(year?: number) {
    const db = await this.read();
    let demandes = db.budgetDemandes;
    if (year) {
      demandes = demandes.filter((item) => {
        const d = new Date(item.createdAt);
        return d.getFullYear() === year;
      });
    }
    return demandes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createBudgetDemande(payload: Record<string, unknown>) {
    const db = await this.read();
    const now = new Date().toISOString();
    const created = {
      id: randomUUID(),
      service: String(payload.service || ''),
      description: String(payload.description || ''),
      montant: Number(payload.montant || 0),
      statut: 'EN_ATTENTE',
      motif: null,
      createdAt: now,
      updatedAt: now,
    };
    db.budgetDemandes.push(created);
    await this.write(db);
    return created;
  }

  async updateBudgetDemande(id: string, payload: Record<string, unknown>) {
    const db = await this.read();
    const index = db.budgetDemandes.findIndex((item) => item.id === id);
    if (index === -1) return null;
    db.budgetDemandes[index] = {
      ...db.budgetDemandes[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    await this.write(db);
    return db.budgetDemandes[index];
  }

  private async read(): Promise<PlaceholderDatabase> {
    await mkdir(path.dirname(this.dataFile), { recursive: true });
    try {
      const raw = await readFile(this.dataFile, 'utf8');
      return { ...DEFAULT_DB, ...JSON.parse(raw) } as PlaceholderDatabase;
    } catch {
      await this.write(DEFAULT_DB);
      return structuredClone(DEFAULT_DB);
    }
  }

  private async write(db: PlaceholderDatabase) {
    await mkdir(path.dirname(this.dataFile), { recursive: true });
    await writeFile(this.dataFile, JSON.stringify(db, null, 2), 'utf8');
  }
}
