import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

function getSeedPassword(): string | null {
  const configuredPassword = process.env.SEED_DEFAULT_PASSWORD?.trim();
  if (configuredPassword) {
    return configuredPassword;
  }

  if (isProduction) {
    return null;
  }

  return null;
}

async function main() {
  if (isProduction) {
    throw new Error('Refusing to run demo seed in production. Use a dedicated migration/import process instead.');
  }

  const seedPassword = getSeedPassword();
  if (!seedPassword) {
    throw new Error('SEED_DEFAULT_PASSWORD is required to seed demo users safely.');
  }

  const password = await bcrypt.hash(seedPassword, 10);

  // ─── USERS ───────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kafountine.gouv.sn' },
    update: {},
    create: { email: 'admin@kafountine.gouv.sn', password, nom: 'Diallo', prenom: 'Mamadou', role: 'ADMIN', isActive: true },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kafountine.gouv.sn' },
    update: {},
    create: { email: 'superadmin@kafountine.gouv.sn', password, nom: 'Ndiaye', prenom: 'Ousmane', role: 'SUPER_ADMIN', isActive: true },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@kafountine.gouv.sn' },
    update: {},
    create: { email: 'agent@kafountine.gouv.sn', password, nom: 'Sarr', prenom: 'Fatou', role: 'AGENT', isActive: true },
  });

  const comptable = await prisma.user.upsert({
    where: { email: 'comptable@kafountine.gouv.sn' },
    update: {},
    create: { email: 'comptable@kafountine.gouv.sn', password, nom: 'Ba', prenom: 'Ibrahima', role: 'COMPTABLE', isActive: true },
  });

  const finances = await prisma.user.upsert({
    where: { email: 'finances@kafountine.gouv.sn' },
    update: {},
    create: { email: 'finances@kafountine.gouv.sn', password, nom: 'Diop', prenom: 'Aminata', role: 'SERVICE_FINANCES', isActive: true },
  });

  const quaiPeche = await prisma.user.upsert({
    where: { email: 'quaipeche@kafountine.gouv.sn' },
    update: {},
    create: { email: 'quaipeche@kafountine.gouv.sn', password, nom: 'Fall', prenom: 'Moussa', role: 'QUAI_PECHE', isActive: true },
  });

  const agents = [admin, superAdmin, agent, comptable, finances, quaiPeche];

  // ─── CONTRIBUTABLES ──────────────────────────────────────
  const contribuablesData = [
    { nin: 'SN-2024-001', nom: 'Sow', prenom: 'Amadou', dateNaiss: '1985-03-15', lieuNaiss: 'Kafountine', adresse: 'Quartier Escale', telephone: '+221771000001', profession: 'Pecheur', typeContribuable: 'PARTICULIER', zone: 'Zone Portuaire', montantImpot: 5000 },
    { nin: 'SN-2024-002', nom: 'Sy', prenom: 'Awa', dateNaiss: '1990-07-22', lieuNaiss: 'Ziguinchor', adresse: 'Rue Principale', telephone: '+221771000002', profession: 'Commercante', typeContribuable: 'PARTICULIER', zone: 'Marche Central', montantImpot: 15000 },
    { nin: 'SN-2024-003', nom: 'Ndiaye', prenom: 'Ibrahima', dateNaiss: '1978-11-08', lieuNaiss: 'Dakar', adresse: 'Avenue de la Republique', telephone: '+221771000003', profession: 'Maitre constructeur', typeContribuable: 'ENTREPRISE', zone: 'Zone Urbaine', montantImpot: 50000 },
    { nin: 'SN-2024-004', nom: 'Diatta', prenom: 'Marie', dateNaiss: '1992-01-30', lieuNaiss: 'Kafountine', adresse: 'Quartier Pecheur', telephone: '+221771000004', profession: 'Restauratrice', typeContribuable: 'PARTICULIER', zone: 'Zone Touristique', montantImpot: 12000 },
    { nin: 'SN-2024-005', nom: 'Camara', prenom: 'Ousmane', dateNaiss: '1980-06-12', lieuNaiss: 'Kolda', adresse: 'Quartier Commerce', telephone: '+221771000005', profession: 'Chauffeur', typeContribuable: 'PARTICULIER', zone: 'Transport', montantImpot: 8000 },
    { nin: 'SN-2024-006', nom: 'Sane', prenom: 'Fatou', dateNaiss: '1995-09-18', lieuNaiss: 'Kafountine', adresse: 'Rue du Marche', telephone: '+221771000006', profession: 'Vendeuse', typeContribuable: 'PARTICULIER', zone: 'Marche Central', montantImpot: 6000 },
    { nin: 'SN-2024-007', nom: 'Sambou', prenom: 'Pierre', dateNaiss: '1975-04-25', lieuNaiss: 'Kafountine', adresse: 'Quartier Mission', telephone: '+221771000007', profession: 'Enseignant', typeContribuable: 'PARTICULIER', zone: 'Zone Scolaire', montantImpot: 3000 },
    { nin: 'SN-2024-008', nom: 'Badji', prenom: 'Aissatou', dateNaiss: '1988-12-05', lieuNaiss: 'Bignona', adresse: 'Quartier Nord', telephone: '+221771000008', profession: 'Couturiere', typeContribuable: 'PARTICULIER', zone: 'Zone Residentielle', montantImpot: 4500 },
    { nin: 'SN-2024-009', nom: 'Coly', prenom: 'Jean', dateNaiss: '1982-08-14', lieuNaiss: 'Kafountine', adresse: 'Rue de la Plage', telephone: '+221771000009', profession: 'Guide touristique', typeContribuable: 'PARTICULIER', zone: 'Zone Touristique', montantImpot: 7000 },
    { nin: 'SN-2024-010', nom: 'Manga', prenom: 'Oumar', dateNaiss: '1970-02-20', lieuNaiss: 'Ziguinchor', adresse: 'Quartier Ancien', telephone: '+221771000010', profession: 'Agriculteur', typeContribuable: 'PARTICULIER', zone: 'Zone Rurale', montantImpot: 2500 },
    { nin: 'SN-2024-011', nom: 'Sene', prenom: 'Abdoulaye', dateNaiss: '1993-10-03', lieuNaiss: 'Kafountine', adresse: 'Quartier Nouveau', telephone: '+221771000011', profession: 'Mecanicien', typeContribuable: 'PARTICULIER', zone: 'Zone Industrielle', montantImpot: 9000 },
    { nin: 'SN-2024-012', nom: 'Dieme', prenom: 'Khady', dateNaiss: '1987-05-28', lieuNaiss: 'Kafountine', adresse: 'Rue des Artisans', telephone: '+221771000012', profession: 'Potiere', typeContribuable: 'PARTICULIER', zone: 'Zone Artisanale', montantImpot: 3500 },
    { nin: 'SN-2024-013', nom: 'Gomis', prenom: 'Luc', dateNaiss: '1965-11-11', lieuNaiss: 'Kafountine', adresse: 'Quartier Admin', telephone: '+221771000013', profession: 'Retraite', typeContribuable: 'PARTICULIER', zone: 'Zone Residentielle', montantImpot: 2000 },
    { nin: 'SN-2024-014', nom: 'Sagna', prenom: 'Rosine', dateNaiss: '1998-03-07', lieuNaiss: 'Kafountine', adresse: 'Quartier Escale', telephone: '+221771000014', profession: 'Infirmiere', typeContribuable: 'PARTICULIER', zone: 'Zone Sante', montantImpot: 4000 },
    { nin: 'SN-2024-015', nom: 'Tamba', prenom: 'Sekou', dateNaiss: '1973-09-19', lieuNaiss: 'Kolda', adresse: 'Route Nationale', telephone: '+221771000015', profession: 'Transporteur', typeContribuable: 'ENTREPRISE', zone: 'Transport', montantImpot: 35000 },
    { nin: 'SN-2024-016', nom: 'Kande', prenom: 'Aminata', dateNaiss: '1991-01-14', lieuNaiss: 'Kafountine', adresse: 'Quartier Marchand', telephone: '+221771000016', profession: 'Boutiquiere', typeContribuable: 'PARTICULIER', zone: 'Marche Central', montantImpot: 11000 },
    { nin: 'SN-2024-017', nom: 'Faye', prenom: 'Moustapha', dateNaiss: '1983-06-22', lieuNaiss: 'Kaolack', adresse: 'Quartier Extension', telephone: '+221771000017', profession: 'Maçon', typeContribuable: 'PARTICULIER', zone: 'Zone Urbaine', montantImpot: 5500 },
    { nin: 'SN-2024-018', nom: 'Diallo', prenom: 'Seynabou', dateNaiss: '1996-12-30', lieuNaiss: 'Kafountine', adresse: 'Rue de la Paix', telephone: '+221771000018', profession: 'Sage-femme', typeContribuable: 'PARTICULIER', zone: 'Zone Sante', montantImpot: 4200 },
    { nin: 'SN-2024-019', nom: 'Kone', prenom: 'Bakary', dateNaiss: '1977-04-08', lieuNaiss: 'Tambacounda', adresse: 'Quartier Sud', telephone: '+221771000019', profession: 'Elevage', typeContribuable: 'ENTREPRISE', zone: 'Zone Rurale', montantImpot: 20000 },
    { nin: 'SN-2024-020', nom: 'Sow', prenom: 'Rokhaya', dateNaiss: '1989-08-16', lieuNaiss: 'Kafountine', adresse: 'Avenue Lamine', telephone: '+221771000020', profession: 'Comptable', typeContribuable: 'PARTICULIER', zone: 'Zone Commerciale', montantImpot: 6500 },
  ];

  const contribuables: Array<{ id: string }> = [];
  for (const c of contribuablesData) {
    const contribuable = await prisma.contribuable.upsert({
      where: { nin: c.nin },
      update: {},
      create: {
        ...c,
        dateNaiss: new Date(c.dateNaiss),
      },
    });
    contribuables.push(contribuable);
  }

  // ─── TRANSACTIONS ────────────────────────────────────────
  const categories = ['TAXE', 'ETAT_CIVIL', 'URBANISME', 'MARCHE', 'TRANSPORT', 'AUTRE'];
  const services: Record<string, string[]> = {
    TAXE: ['Taxe municipale', 'Taxe fonciere', 'Taxe professionnelle', 'Taxe salubrite'],
    ETAT_CIVIL: ['Acte de naissance', 'Acte de mariage', 'Acte de deces', 'Certificat de residence'],
    URBANISME: ['Permis de construire', 'Autorisation travaux', 'Certificat conformite', 'Titre foncier'],
    MARCHE: ['Place de marche', 'Etalage', 'Licence commerciale', 'Droit de stationnement'],
    TRANSPORT: ['Taxe vehicule', 'Permis circulation', 'Taxe poids lourd', 'Moto-taxi'],
    AUTRE: ['Amende', 'Divers', 'Recouvrement'],
  };
  const modes = ['ESPECE', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE'];
  const statuts = ['PAYE', 'PAYE', 'PAYE', 'EN_ATTENTE', 'ANNULE']; // weighted toward PAYE

  const existingTx = await prisma.transaction.count();
  if (existingTx < 10) {
    const txData: Prisma.TransactionCreateManyInput[] = [];
    let txNum = existingTx;

    for (let month = 0; month < 12; month++) {
      const nbTx = 5 + Math.floor(Math.random() * 10); // 5-14 transactions per month
      for (let i = 0; i < nbTx; i++) {
        txNum++;
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const svcList = services[cat];
        const svc = svcList[Math.floor(Math.random() * svcList.length)];
        const contrib = contribuables[Math.floor(Math.random() * contribuables.length)];
        const agentUser = agents[Math.floor(Math.random() * agents.length)];
        const montant = Math.round((500 + Math.random() * 99500) / 100) * 100; // 500 - 100000
        const quantite = 1 + Math.floor(Math.random() * 3);
        const date = new Date(2026, month, 1 + Math.floor(Math.random() * 28));
        const statut = statuts[Math.floor(Math.random() * statuts.length)];
        const mode = modes[Math.floor(Math.random() * modes.length)];

        txData.push({
          numero: `TX-2026-${String(txNum).padStart(3, '0')}`,
          contribuableId: contrib.id,
          agentId: agentUser.id,
          categorie: cat,
          service: svc,
          quantite,
          tarifUnitaire: montant,
          montant: montant * quantite,
          modePaiement: mode,
          statut,
          date,
          year: 2026,
        });
      }
    }

    await prisma.transaction.createMany({ data: txData, skipDuplicates: true });
    console.log(`  Created ${txData.length} transactions`);
  }

  const [budgetLineCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "BudgetLine"');
  if (Number(budgetLineCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "BudgetLine" ("id", "code", "libelle", "description", "prevu", "depense", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($22,$23,$24,$25,$26,$27,$28,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      randomUUID(), 'FONC', 'Fonctionnement général', 'Charges courantes de la mairie', 15000000, 4200000, 2026,
      randomUUID(), 'EQUI', 'Équipements municipaux', 'Maintenance et acquisition de matériel', 9000000, 2150000, 2026,
      randomUUID(), 'SOC', 'Actions sociales', 'Aides et interventions sociales', 7000000, 1850000, 2026,
      randomUUID(), 'VOIR', 'Voirie et assainissement', 'Travaux de voirie et entretien', 12500000, 3200000, 2026
    );
    console.log('  Created budget lines');
  }

  const [budgetRequestCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "BudgetRequest"');
  if (Number(budgetRequestCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "BudgetRequest" ("id", "service", "description", "montant", "statut", "motif", "year", "requestedById", "approvedById", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($10,$11,$12,$13,$14,$15,$16,$17,$18,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($19,$20,$21,$22,$23,$24,$25,$26,$27,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      randomUUID(), 'Service technique', 'Réhabilitation de la voirie principale', 1800000, 'EN_ATTENTE', null, 2026, finances.id, null,
      randomUUID(), 'Cabinet du maire', 'Achat de mobilier de bureau', 650000, 'APPROUVE', null, 2026, admin.id, superAdmin.id,
      randomUUID(), 'Action sociale', 'Appui d’urgence pour ménages vulnérables', 400000, 'REJETE', 'Budget complémentaire non encore voté', 2026, agent.id, superAdmin.id
    );
    console.log('  Created budget requests');
  }

  const [auditLogCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AuditLog"');
  if (Number(auditLogCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AuditLog" ("id", "userId", "userName", "role", "action", "module", "details", "status", "ipAddress", "year", "timestamp") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11), ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22), ($23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)',
      randomUUID(), superAdmin.id, `${superAdmin.prenom} ${superAdmin.nom}`, superAdmin.role, 'Initialisation plateforme', 'Audit', 'Initialisation des journaux et paramètres techniques', 'success', null, 2026, new Date('2026-01-02T08:30:00.000Z'),
      randomUUID(), admin.id, `${admin.prenom} ${admin.nom}`, admin.role, 'Création utilisateur', 'Utilisateurs', 'Création du compte comptable@kafountine.gouv.sn', 'success', null, 2026, new Date('2026-01-05T10:15:00.000Z'),
      randomUUID(), finances.id, `${finances.prenom} ${finances.nom}`, finances.role, 'Création demande budgétaire', 'Budget', 'Demande de réhabilitation de la voirie principale', 'warning', null, 2026, new Date('2026-02-14T11:45:00.000Z')
    );
    console.log('  Created audit logs');
  }

  const [etatCivilCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "EtatCivilRequest"');
  if (Number(etatCivilCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "EtatCivilRequest" ("id", "numero", "contribuableId", "agentId", "typeDocument", "exemplaires", "montant", "statut", "observations", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24), ($25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36), ($37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48), ($49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60), ($61,$62,$63,$64,$65,$66,$67,$68,$69,$70,$71,$72), ($73,$74,$75,$76,$77,$78,$79,$80,$81,$82,$83,$84)',
      randomUUID(), 'EC-2026-00001', contribuables[0].id, agent.id, 'Extrait de naissance', 2, 1000, 'DELIVREE', 'Documents délivrés', 2026, new Date('2026-01-12T09:10:00.000Z'), new Date('2026-01-12T09:10:00.000Z'),
      randomUUID(), 'EC-2026-00002', contribuables[3].id, admin.id, 'Certificat de résidence', 1, 1000, 'EN_ATTENTE', 'Vérification en cours', 2026, new Date('2026-02-03T11:25:00.000Z'), new Date('2026-02-03T11:25:00.000Z'),
      randomUUID(), 'EC-2026-00003', contribuables[5].id, agent.id, 'Certificat de vie', 1, 500, 'REJETEE', 'Pièce manquante', 2026, new Date('2026-03-18T14:40:00.000Z'), new Date('2026-03-18T14:40:00.000Z'),
      randomUUID(), 'EC-2026-00004', contribuables[8].id, agent.id, 'Acte de mariage', 3, 2000, 'DELIVREE', 'Copies conformes délivrées', 2026, new Date('2026-01-20T10:00:00.000Z'), new Date('2026-01-25T15:30:00.000Z'),
      randomUUID(), 'EC-2026-00005', contribuables[12].id, admin.id, 'Extrait de naissance', 1, 500, 'EN_ATTENTE', 'En cours d\'instruction', 2026, new Date('2026-04-05T08:30:00.000Z'), new Date('2026-04-05T08:30:00.000Z'),
      randomUUID(), 'EC-2026-00006', contribuables[15].id, agent.id, 'Certificat de décès', 2, 1500, 'DELIVREE', 'Transmis au demandeur', 2026, new Date('2026-02-28T16:00:00.000Z'), new Date('2026-03-01T09:00:00.000Z'),
      randomUUID(), 'EC-2026-00007', contribuables[18].id, admin.id, 'Carte d\'identité', 1, 2500, 'EN_ATTENTE', 'Photo à fournir', 2026, new Date('2026-04-10T11:15:00.000Z'), new Date('2026-04-10T11:15:00.000Z')
    );
    console.log('  Created etat civil requests');
  }

  const [urbanismeCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "UrbanismeCase"');
  if (Number(urbanismeCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "UrbanismeCase" ("id", "numero", "contribuableId", "agentId", "type", "description", "surface", "localisation", "nature", "montant", "statut", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14), ($15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28), ($29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42), ($43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56), ($57,$58,$59,$60,$61,$62,$63,$64,$65,$66,$67,$68,$69,$70), ($71,$72,$73,$74,$75,$76,$77,$78,$79,$80,$81,$82,$83,$84), ($85,$86,$87,$88,$89,$90,$91,$92,$93,$94,$95,$96,$97,$98)',
      randomUUID(), 'URB-2026-00001', contribuables[2].id, agent.id, 'permis-construire', 'Construction annexe commerciale', 120, 'Zone urbaine - parcelle 14', 'Commercial', 600000, 'EN_ATTENTE', 2026, new Date('2026-01-20T10:00:00.000Z'), new Date('2026-01-20T10:00:00.000Z'),
      randomUUID(), 'URB-2026-00002', contribuables[1].id, admin.id, 'autorisation-travaux', 'Réfection façade et extension', null, 'Marché central', 'Réhabilitation', 2500, 'VALIDE', 2026, new Date('2026-02-11T08:45:00.000Z'), new Date('2026-02-15T16:20:00.000Z'),
      randomUUID(), 'URB-2026-00003', contribuables[8].id, agent.id, 'titre-foncier', 'Régularisation foncière familiale', null, 'Quartier plage sud', 'Foncier', 10000, 'REJETE', 2026, new Date('2026-03-04T13:15:00.000Z'), new Date('2026-03-09T10:30:00.000Z'),
      randomUUID(), 'URB-2026-00004', contribuables[4].id, agent.id, 'permis-construire', 'Construction maison habitable R+1', 180, 'Quartier Escale', 'Résidentiel', 850000, 'VALIDE', 2026, new Date('2026-01-05T09:00:00.000Z'), new Date('2026-01-20T14:30:00.000Z'),
      randomUUID(), 'URB-2026-00005', contribuables[6].id, admin.id, 'autorisation-travaux', 'Pose dalle béton extérieure', 45, 'Rue Principale', 'Extension', 35000, 'EN_ATTENTE', 2026, new Date('2026-04-01T07:30:00.000Z'), new Date('2026-04-01T07:30:00.000Z'),
      randomUUID(), 'URB-2026-00006', contribuables[9].id, agent.id, 'certificat-conformite', 'Conformité construction existante', 95, 'Zone Portuaire', 'Commercial', 5000, 'VALIDE', 2026, new Date('2026-02-10T11:00:00.000Z'), new Date('2026-02-18T10:00:00.000Z'),
      randomUUID(), 'URB-2026-00007', contribuables[11].id, admin.id, 'permis-démolir', 'Démolition строage ancien', 60, 'Quartier Nord', 'Foncier', 15000, 'EN_ATTENTE', 2026, new Date('2026-04-08T08:45:00.000Z'), new Date('2026-04-08T08:45:00.000Z')
    );
    console.log('  Created urbanisme cases');
  }

  const [marketPlaceCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "MarketPlace"');
  if (Number(marketPlaceCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14), ($15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28), ($29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)',
      randomUUID(), 'A-01', 'Place', 'Bloc A', contribuables[1].id, 'Fruits et légumes', '+221771000002', new Date('2026-01-08T08:00:00.000Z'), 5000, 'Janvier 2026', 'OCCUPEE', 2026, new Date('2026-01-08T08:00:00.000Z'), new Date('2026-01-08T08:00:00.000Z'),
      randomUUID(), 'A-02', 'Place', 'Bloc A', contribuables[4].id, 'Poissons frais', '+221771000005', new Date('2026-01-10T07:00:00.000Z'), 6000, 'Janvier 2026', 'OCCUPEE', 2026, new Date('2026-01-10T07:00:00.000Z'), new Date('2026-01-10T07:00:00.000Z'),
      randomUUID(), 'B-10', 'Boutique', 'Bloc B', contribuables[8].id, 'Bijouterie', '+221771000009', new Date('2026-01-15T10:00:00.000Z'), 15000, 'Janvier 2026', 'OCCUPEE', 2026, new Date('2026-01-15T10:00:00.000Z'), new Date('2026-01-15T10:00:00.000Z')
    );
    console.log('  Created market places');
  }

  const [marketPlaceCount2] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "MarketPlace" WHERE "numeroPlace" = $1', 'B-11');
  if (Number(marketPlaceCount2?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14), ($15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28), ($29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)',
      randomUUID(), 'B-11', 'Boutique', 'Bloc B', contribuables[3].id, 'Restauration', '+221771000004', new Date('2026-02-01T09:00:00.000Z'), 18000, 'Février 2026', 'OCCUPEE', 2026, new Date('2026-02-01T09:00:00.000Z'), new Date('2026-02-01T09:00:00.000Z'),
      randomUUID(), 'B-12', 'Boutique', 'Bloc B', contribuables[5].id, 'Textile', '+221771000006', new Date('2026-02-01T09:30:00.000Z'), 12000, 'Février 2026', 'OCCUPEE', 2026, new Date('2026-02-01T09:30:00.000Z'), new Date('2026-02-01T09:30:00.000Z'),
      randomUUID(), 'C-01', 'Kiosque', 'Bloc C', contribuables[14].id, 'Boissons', '+221771000014', new Date('2026-01-20T08:00:00.000Z'), 7000, 'Janvier 2026', 'OCCUPEE', 2026, new Date('2026-01-20T08:00:00.000Z'), new Date('2026-01-20T08:00:00.000Z')
    );
    console.log('  Created market places (batch 2)');
  }

  const [marketPaymentCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "MarketPayment"');
  if (Number(marketPaymentCount?.count || 0) === 0) {
    const places = await prisma.$queryRawUnsafe<Array<{ id: string; numeroPlace: string }>>('SELECT "id", "numeroPlace" FROM "MarketPlace" ORDER BY "numeroPlace" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "MarketPayment" ("id", "placeId", "montant", "reference", "periode", "statut", "datePaiement", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10), ($11,$12,$13,$14,$15,$16,$17,$18,$19,$20)',
      randomUUID(), places[0].id, 5000, 'MRC-2026-0001', 'Janvier 2026', 'PAYE', new Date('2026-01-08T08:15:00.000Z'), 2026, new Date('2026-01-08T08:15:00.000Z'), new Date('2026-01-08T08:15:00.000Z'),
      randomUUID(), places[1].id, 12000, 'MRC-2026-0002', 'Février 2026', 'PAYE', new Date('2026-02-02T10:00:00.000Z'), 2026, new Date('2026-02-02T10:00:00.000Z'), new Date('2026-02-02T10:00:00.000Z')
    );
    console.log('  Created market payments');
  }

  const [motoCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "MotoRegistration"');
  if (Number(motoCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "MotoRegistration" ("id", "matricule", "marque", "modele", "annee", "couleur", "proprietaireId", "conducteurId", "permis", "statut", "photo", "enRetard", "montantPenalite", "prochainPaiement", "dernierPaiement", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18), ($19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36), ($37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54), ($55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66,$67,$68,$69,$70,$71,$72), ($73,$74,$75,$76,$77,$78,$79,$80,$81,$82,$83,$84,$85,$86,$87,$88,$89,$90), ($91,$92,$93,$94,$95,$96,$97,$98,$99,$100,$101,$102,$103,$104,$105,$106,$107,$108)',
      randomUUID(), 'DK-1234-AA', 'TVS', 'Jakarta ET 125', 2025, 'Noir', contribuables[4].id, contribuables[4].id, 'PRM-0001', 'ACTIVE', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', false, 250, new Date('2026-04-30T00:00:00.000Z'), new Date('2026-03-31T08:00:00.000Z'), 2026, new Date('2026-01-05T08:00:00.000Z'), new Date('2026-03-31T08:00:00.000Z'),
      randomUUID(), 'DK-5678-BB', 'Bajaj', 'RE Compact 110', 2025, 'Bleu marine', contribuables[0].id, contribuables[6].id, 'PRM-0002', 'ACTIVE', 'https://images.unsplash.com/photo-1622185135505-2d795043906a?w=400&h=300&fit=crop', true, 250, new Date('2026-04-15T00:00:00.000Z'), new Date('2026-02-15T09:00:00.000Z'), 2026, new Date('2026-01-12T10:00:00.000Z'), new Date('2026-03-20T10:00:00.000Z'),
      randomUUID(), 'DK-9012-CC', 'Piaggio', 'Ape City', 2024, 'Rouge', contribuables[7].id, contribuables[7].id, 'PRM-0003', 'ACTIVE', 'https://images.unsplash.com/photo-1605705653708-69cc7ecd11ee?w=400&h=300&fit=crop', false, 250, new Date('2026-04-28T00:00:00.000Z'), new Date('2026-03-28T11:00:00.000Z'), 2026, new Date('2026-02-01T11:00:00.000Z'), new Date('2026-03-28T11:00:00.000Z'),
      randomUUID(), 'DK-3456-DD', 'TVS', 'Storm 125', 2026, 'Blanc', contribuables[9].id, contribuables[10].id, 'PRM-0004', 'ACTIVE', 'https://images.unsplash.com/photo-1588756598703-e98e6e9197bf?w=400&h=300&fit=crop', false, 250, new Date('2026-05-15T00:00:00.000Z'), new Date('2026-04-01T10:00:00.000Z'), 2026, new Date('2026-03-15T09:00:00.000Z'), new Date('2026-04-01T10:00:00.000Z'),
      randomUUID(), 'DK-7890-EE', 'Yadea', 'GT3', 2024, 'Gris', contribuables[11].id, null, 'PRM-0005', 'ACTIVE', 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=400&h=300&fit=crop', false, 250, new Date('2026-05-01T00:00:00.000Z'), new Date('2026-03-01T14:00:00.000Z'), 2026, new Date('2026-02-20T08:00:00.000Z'), new Date('2026-03-01T14:00:00.000Z'),
      randomUUID(), 'DK-1122-FF', 'Bajaj', 'Pulsar 150', 2023, 'Noir vit', contribuables[13].id, contribuables[13].id, 'PRM-0006', 'ACTIVE', 'https://images.unsplash.com/photo-1558981403-c5f80ebc5e23?w=400&h=300&fit=crop', false, 250, new Date('2026-04-20T00:00:00.000Z'), new Date('2026-03-20T07:00:00.000Z'), 2026, new Date('2026-01-28T10:00:00.000Z'), new Date('2026-03-20T07:00:00.000Z')
    );
    console.log('  Created motos');
  }

  const [motoPaymentCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "MotoPayment"');
  if (Number(motoPaymentCount?.count || 0) === 0) {
    const motos = await prisma.$queryRawUnsafe<Array<{ id: string; matricule: string }>>('SELECT "id", "matricule" FROM "MotoRegistration" ORDER BY "matricule" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "MotoPayment" ("id", "motoId", "montant", "reference", "statut", "datePaiement", "mois", "numeroRecu", "agent", "year", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)',
      randomUUID(), motos[0].id, 1000, 'MOTO-2026-0001', 'PAYE', new Date('2026-03-31T08:00:00.000Z'), 'Mars 2026', 'MOTO-REC-0001', 'Agent Municipal', 2026, new Date('2026-03-31T08:00:00.000Z'), new Date('2026-03-31T08:00:00.000Z'),
      randomUUID(), motos[1].id, 1250, 'MOTO-2026-0002', 'PAYE', new Date('2026-02-15T09:00:00.000Z'), 'Février 2026', 'MOTO-REC-0002', 'Agent Municipal', 2026, new Date('2026-02-15T09:00:00.000Z'), new Date('2026-02-15T09:00:00.000Z')
    );
    console.log('  Created moto payments');
  }

  const [trainingCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "TrainingProgram"');
  if (Number(trainingCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "TrainingProgram" ("id","nom","domaine","duree","responsable","budget","dateDebut","dateFin","statut","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24), ($25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36), ($37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48), ($49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60), ($61,$62,$63,$64,$65,$66,$67,$68,$69,$70,$71,$72), ($73,$74,$75,$76,$77,$78,$79,$80,$81,$82,$83,$84)',
      randomUUID(), 'Formation en transformation halieutique', 'Pêche', '3 mois', 'Mme Diop', 2500000, new Date('2026-01-10T00:00:00.000Z'), new Date('2026-03-30T00:00:00.000Z'), 'TERMINEE', 2026, new Date('2026-01-01T08:00:00.000Z'), new Date('2026-03-30T18:00:00.000Z'),
      randomUUID(), 'Initiation au numérique', 'Informatique', '2 mois', 'M. Fall', 1800000, new Date('2026-04-05T00:00:00.000Z'), new Date('2026-05-30T00:00:00.000Z'), 'EN_COURS', 2026, new Date('2026-03-20T08:00:00.000Z'), new Date('2026-04-05T08:00:00.000Z'),
      randomUUID(), 'Éleveur professionnel', 'Élevage', '4 mois', 'Dr. Sow', 3200000, new Date('2026-01-15T00:00:00.000Z'), new Date('2026-05-15T00:00:00.000Z'), 'TERMINEE', 2026, new Date('2026-01-10T09:00:00.000Z'), new Date('2026-05-15T16:00:00.000Z'),
      randomUUID(), 'Coiffure et cosmétique', 'Artisanat', '3 mois', 'Mme Bâ', 1500000, new Date('2026-02-01T00:00:00.000Z'), new Date('2026-04-30T00:00:00.000Z'), 'TERMINEE', 2026, new Date('2026-01-25T08:00:00.000Z'), new Date('2026-04-30T17:00:00.000Z'),
      randomUUID(), 'Maçonnerie générale', 'Bâtiment', '6 mois', 'M. Faye', 4500000, new Date('2026-03-01T00:00:00.000Z'), new Date('2026-08-30T00:00:00.000Z'), 'EN_COURS', 2026, new Date('2026-02-20T07:00:00.000Z'), new Date('2026-03-01T08:00:00.000Z'),
      randomUUID(), 'Réparation moteur motorcycles', 'Mécanique', '4 mois', 'M. Sène', 2800000, new Date('2026-04-15T00:00:00.000Z'), new Date('2026-08-15T00:00:00.000Z'), 'EN_COURS', 2026, new Date('2026-04-01T09:00:00.000Z'), new Date('2026-04-15T07:00:00.000Z'),
      randomUUID(), 'Transformation produitsforestiers', 'Artisanat', '2 mois', 'Mme Kande', 1200000, new Date('2026-05-01T00:00:00.000Z'), new Date('2026-06-30T00:00:00.000Z'), 'PLANIFIEE', 2026, new Date('2026-04-20T10:00:00.000Z'), new Date('2026-04-20T10:00:00.000Z')
    );
    console.log('  Created training programs');
  }

  const [youthCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "YouthProfile"');
  if (Number(youthCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "YouthProfile" ("id","nom","prenom","cni","telephone","adresse","niveauEtude","sexe","dateNaiss","photo","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13), ($14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26), ($27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39), ($40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52), ($53,$54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65), ($66,$67,$68,$69,$70,$71,$72,$73,$74,$75,$76,$77,$78), ($79,$80,$81,$82,$83,$84,$85,$86,$87,$88,$89,$90,$91), ($92,$93,$94,$95,$96,$97,$98,$99,$100,$101,$102,$103,$104), ($105,$106,$107,$108,$109,$110,$111,$112,$113,$114,$115,$116,$117)',
      randomUUID(), 'Coly', 'Awa', 'YTH-0001', '+221770100001', 'Quartier escale', 'BAC', 'F', new Date('2001-05-10T00:00:00.000Z'), 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', 2026, new Date('2026-01-05T09:00:00.000Z'), new Date('2026-01-05T09:00:00.000Z'),
      randomUUID(), 'Sambou', 'Moussa', 'YTH-0002', '+221770100002', 'Quartier mission', 'BFEM', 'M', new Date('2000-11-20T00:00:00.000Z'), 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', 2026, new Date('2026-01-06T09:00:00.000Z'), new Date('2026-01-06T09:00:00.000Z'),
      randomUUID(), 'Badji', 'Fatou', 'YTH-0003', '+221770100003', 'Quartier nord', 'Licence', 'F', new Date('1999-07-14T00:00:00.000Z'), 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', 2026, new Date('2026-04-02T09:00:00.000Z'), new Date('2026-04-02T09:00:00.000Z'),
      randomUUID(), 'Sow', 'Moussa', 'YTH-0004', '+221770100004', 'Zone portuaire', 'CAP', 'M', new Date('2002-03-22T00:00:00.000Z'), 'https://images.unsplash.com/photo-1500648767791-00bcc4452b71?w=200&h=200&fit=crop', 2026, new Date('2026-01-08T08:00:00.000Z'), new Date('2026-01-08T08:00:00.000Z'),
      randomUUID(), 'Diallo', 'Mariama', 'YTH-0005', '+221770100005', 'Marché central', 'BAC+2', 'F', new Date('1998-09-05T00:00:00.000Z'), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', 2026, new Date('2026-01-10T10:00:00.000Z'), new Date('2026-01-10T10:00:00.000Z'),
      randomUUID(), 'Ndiaye', 'Ibrahim', 'YTH-0006', '+221770100006', 'Quartier nouveau', 'Bac technique', 'M', new Date('2001-12-15T00:00:00.000Z'), 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', 2026, new Date('2026-01-12T07:30:00.000Z'), new Date('2026-01-12T07:30:00.000Z'),
      randomUUID(), 'Sy', 'Ndeye', 'YTH-0007', '+221770100007', 'Rue principale', 'BFEM', 'F', new Date('2003-01-28T00:00:00.000Z'), 'https://images.unsplash.com/photo-1544005313-94d997028b09?w=200&h=200&fit=crop', 2026, new Date('2026-02-01T09:00:00.000Z'), new Date('2026-02-01T09:00:00.000Z'),
      randomUUID(), 'Ba', 'Moussa', 'YTH-0008', '+221770100008', 'Quartier sud', 'CAP', 'M', new Date('2000-06-12T00:00:00.000Z'), 'https://images.unsplash.com/photo-1506794778202-84589b3d1255?w=200&h=200&fit=crop', 2026, new Date('2026-02-05T08:00:00.000Z'), new Date('2026-02-05T08:00:00.000Z'),
      randomUUID(), 'Toure', 'Aminata', 'YTH-0009', '+221770100009', 'Zone urbaine', 'Bac professionnel', 'F', new Date('1999-04-03T00:00:00.000Z'), 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop', 2026, new Date('2026-03-10T10:30:00.000Z'), new Date('2026-03-10T10:30:00.000Z')
    );
    console.log('  Created youth profiles');
  }

  const [enrollmentCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "YouthEnrollment"');
  if (Number(enrollmentCount?.count || 0) === 0) {
    const formations = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "TrainingProgram" ORDER BY "dateDebut" ASC');
    const jeunes = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "YouthProfile" ORDER BY "createdAt" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "YouthEnrollment" ("id","jeuneId","formationId","dateInscription","tauxAssiduite","statutFinal","presences","absences","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10), ($11,$12,$13,$14,$15,$16,$17,$18,$19,$20), ($21,$22,$23,$24,$25,$26,$27,$28,$29,$30)',
      randomUUID(), jeunes[0].id, formations[0].id, new Date('2026-01-10T08:00:00.000Z'), 92, 'Certifié', 22, 2, new Date('2026-01-10T08:00:00.000Z'), new Date('2026-03-30T18:00:00.000Z'),
      randomUUID(), jeunes[1].id, formations[0].id, new Date('2026-01-10T08:00:00.000Z'), 84, 'En cours', 20, 4, new Date('2026-01-10T08:00:00.000Z'), new Date('2026-03-20T18:00:00.000Z'),
      randomUUID(), jeunes[2].id, formations[1].id, new Date('2026-04-05T08:00:00.000Z'), 78, 'En cours', 8, 1, new Date('2026-04-05T08:00:00.000Z'), new Date('2026-04-08T08:00:00.000Z')
    );
    console.log('  Created youth enrollments');
  }

  const [fishermanCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "Fisherman"');
  if (Number(fishermanCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "Fisherman" ("id","nom","prenom","telephone","nin","adresse","statut","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10), ($11,$12,$13,$14,$15,$16,$17,$18,$19,$20), ($21,$22,$23,$24,$25,$26,$27,$28,$29,$30)',
      randomUUID(), 'Sall', 'Moussa', '+221776000001', 'PCH-0001', 'Quai nord', 'ACTIF', 2026, new Date('2026-01-05T06:00:00.000Z'), new Date('2026-01-05T06:00:00.000Z'),
      randomUUID(), 'Diop', 'Aliou', '+221776000002', 'PCH-0002', 'Quai centre', 'ACTIF', 2026, new Date('2026-01-06T06:00:00.000Z'), new Date('2026-01-06T06:00:00.000Z'),
      randomUUID(), 'Touré', 'Mamadou', '+221776000003', 'PCH-0003', 'Quai sud', 'INACTIF', 2026, new Date('2026-01-07T06:00:00.000Z'), new Date('2026-01-07T06:00:00.000Z')
    );
    console.log('  Created fishermen');
  }

  const [boatCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "FishingBoat"');
  if (Number(boatCount?.count || 0) === 0) {
    const pecheurs = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "Fisherman" ORDER BY "createdAt" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "FishingBoat" ("id","nom","immatriculation","type","taille","moteur","statut","pecheurId","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11), ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)',
      randomUUID(), 'Aigle de mer', 'EMB-001', 'Pirogue', 12.5, 'Yamaha 40CV', 'ACTIF', pecheurs[0].id, 2026, new Date('2026-01-10T07:00:00.000Z'), new Date('2026-01-10T07:00:00.000Z'),
      randomUUID(), 'Casamance I', 'EMB-002', 'Pirogue', 10.2, 'Suzuki 25CV', 'EN_MAINTENANCE', pecheurs[1].id, 2026, new Date('2026-01-11T07:00:00.000Z'), new Date('2026-01-11T07:00:00.000Z')
    );
    console.log('  Created fishing boats');
  }

  const [commissionCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "FishCommission"');
  if (Number(commissionCount?.count || 0) === 0) {
    const pecheurs = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "Fisherman" ORDER BY "createdAt" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "FishCommission" ("id","numero","poids","typePoisson","temperatura","observations","statut","date","pecheurId","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)',
      randomUUID(), 'CF-2026-001', 150, 'Maquereau', -5, 'Lot du matin', 'ENREGISTREE', new Date('2026-03-17T08:30:00.000Z'), pecheurs[0].id, 2026, new Date('2026-03-17T08:30:00.000Z'), new Date('2026-03-17T08:30:00.000Z'),
      randomUUID(), 'CF-2026-002', 200, 'Sardine', -4, 'Qualité conforme', 'VALIDEE', new Date('2026-03-17T09:15:00.000Z'), pecheurs[1].id, 2026, new Date('2026-03-17T09:15:00.000Z'), new Date('2026-03-17T09:30:00.000Z')
    );
    console.log('  Created fish commissions');
  }

  const [truckCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "RefrigeratedTruck"');
  if (Number(truckCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "RefrigeratedTruck" ("id","immatriculation","marque","modele","capacite","chauffeur","telephone","statut","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11), ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)',
      randomUUID(), 'TRK-001', 'Mercedes', 'Actros', 12000, 'Ibrahima Ba', '+221775000001', 'ACTIF', 2026, new Date('2026-02-01T07:00:00.000Z'), new Date('2026-02-01T07:00:00.000Z'),
      randomUUID(), 'TRK-002', 'Renault', 'Kerax', 9000, 'Seydou Diallo', '+221775000002', 'ACTIF', 2026, new Date('2026-02-02T07:00:00.000Z'), new Date('2026-02-02T07:00:00.000Z')
    );
    console.log('  Created refrigerated trucks');
  }

  const [expeditionCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "ShippingExpedition"');
  if (Number(expeditionCount?.count || 0) === 0) {
    const camions = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "RefrigeratedTruck" ORDER BY "createdAt" ASC');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "ShippingExpedition" ("id","numero","date","poids","destination","montant","statut","observations","camionId","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)',
      randomUUID(), 'EXP-2026-001', new Date('2026-03-18T06:00:00.000Z'), 800, 'Dakar', 450000, 'EXPEDIEE', 'Départ à l’aube', camions[0].id, 2026, new Date('2026-03-18T06:00:00.000Z'), new Date('2026-03-18T06:00:00.000Z'),
      randomUUID(), 'EXP-2026-002', new Date('2026-03-19T06:00:00.000Z'), 620, 'Ziguinchor', 320000, 'PLANIFIEE', 'Chargement en attente', camions[1].id, 2026, new Date('2026-03-19T06:00:00.000Z'), new Date('2026-03-19T06:00:00.000Z')
    );
    console.log('  Created shipping expeditions');
  }

  const [settingsTariffCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingTariff"');
  if (Number(settingsTariffCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AppSettingTariff" ("id", "categorie", "nom", "montant", "unite", "description", "actif", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($22,$23,$24,$25,$26,$27,$28,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      randomUUID(), 'État Civil', 'Extrait de naissance', 1000, 'FCFA', 'Délivrance standard d’un extrait', true,
      randomUUID(), 'Urbanisme', 'Permis de construire', 600000, 'FCFA', 'Instruction complète du permis', true,
      randomUUID(), 'Marché', 'Occupation place mensuelle', 5000, 'FCFA/mois', 'Place standard marché central', true,
      randomUUID(), 'Transport', 'Licence moto-taxi', 1000, 'FCFA/mois', 'Paiement mensuel moto-taxi', true
    );
    console.log('  Created app setting tariffs');
  }

  const [settingsPenaltyCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPenalty"');
  if (Number(settingsPenaltyCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ($13,$14,$15,$16,$17,$18,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      randomUUID(), 'Retard paiement marché', 'Majoration appliquée après échéance mensuelle', 1500, '5 jours après échéance', true,
      randomUUID(), 'Retard dossier urbanisme', 'Frais complémentaires en cas de dossier incomplet prolongé', 5000, '10 jours après notification', true,
      randomUUID(), 'Retard moto-taxi', 'Pénalité standard de régularisation', 250, 'Immédiatement après échéance', true
    );
    console.log('  Created app setting penalties');
  }

  const [settingsPermissionCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppSettingPermission"');
  if (Number(settingsPermissionCount?.count || 0) === 0) {
    const modules = [
      'Dashboard',
      'Contribuables',
      'Recettes',
      'Taxes',
      'Utilisateurs',
      'Audit',
      'Budget',
      'État civil',
      'Urbanisme',
      'Marché',
      'Motos',
      'Formations',
      'Quai de pêche',
      'Paramètres',
    ];
    const roles = ['AGENT', 'SUPERVISEUR', 'COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

    for (const moduleName of modules) {
      for (const role of roles) {
        const enabled =
          role === 'SUPER_ADMIN'
            ? true
            : role === 'ADMIN'
              ? true
              : role === 'COMPTABLE'
                ? ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'Budget', 'Marché'].includes(moduleName)
                : role === 'SUPERVISEUR'
                  ? ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme'].includes(moduleName)
                  : ['Dashboard', 'Contribuables', 'Recettes', 'Taxes', 'État civil', 'Urbanisme', 'Marché', 'Motos', 'Formations', 'Quai de pêche'].includes(moduleName);

        await prisma.$executeRawUnsafe(
          'INSERT INTO "AppSettingPermission" ("id", "module", "role", "enabled", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
          randomUUID(),
          moduleName,
          role,
          enabled
        );
      }
    }
    console.log('  Created app setting permissions');
  }

  const [notificationCount] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "AppNotification"');
  if (Number(notificationCount?.count || 0) === 0) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AppNotification" ("id","userId","type","titre","message","montant","contribuable","agent","lu","readAt","year","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13), ($14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26), ($27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)',
      randomUUID(), admin.id, 'alerte', 'Suivi recouvrement', 'Vérifier les transactions en attente du mois courant.', null, null, `${admin.prenom} ${admin.nom}`, false, null, 2026, new Date('2026-04-01T08:00:00.000Z'), new Date('2026-04-01T08:00:00.000Z'),
      randomUUID(), superAdmin.id, 'info', 'Sauvegarde recommandée', 'Planifier une sauvegarde applicative avant le prochain déploiement.', null, null, `${superAdmin.prenom} ${superAdmin.nom}`, false, null, 2026, new Date('2026-04-02T09:00:00.000Z'), new Date('2026-04-02T09:00:00.000Z'),
      randomUUID(), finances.id, 'succes', 'Rapport mensuel prêt', 'Les indicateurs financiers du mois sont consolidés.', 1250000, null, `${finances.prenom} ${finances.nom}`, true, new Date('2026-04-03T10:00:00.000Z'), 2026, new Date('2026-04-03T10:00:00.000Z'), new Date('2026-04-03T10:00:00.000Z')
    );
    console.log('  Created app notifications');
  }

  console.log('Prisma seed done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
