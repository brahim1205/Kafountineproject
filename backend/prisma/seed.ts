/* eslint-disable no-console */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

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
