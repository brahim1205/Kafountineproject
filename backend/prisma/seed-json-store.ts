import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_FILE = path.resolve(process.cwd(), 'data', 'placeholder-store.json');

function uuid() {
  return randomUUID();
}

function ts(month: number, day: number) {
  return new Date(2026, month, day).toISOString();
}

function now() {
  return new Date().toISOString();
}

async function main() {
  // ─── FORMATIONS ──────────────────────────────────────────
  const formations = [
    { id: uuid(), nom: 'Informatique de base', domaine: 'Numerique', duree: '3 mois', responsable: 'M. Sarr', budget: 2500000, dateDebut: '2026-01-15', dateFin: '2026-04-15', statut: 'TERMINEE', year: 2026, createdAt: ts(0, 15), updatedAt: ts(0, 15) },
    { id: uuid(), nom: 'Couture avancee', domaine: 'Artisanat', duree: '6 mois', responsable: 'Mme Ndiaye', budget: 1800000, dateDebut: '2026-02-01', dateFin: '2026-08-01', statut: 'EN_COURS', year: 2026, createdAt: ts(1, 1), updatedAt: ts(1, 1) },
    { id: uuid(), nom: 'Mecanique automobile', domaine: 'Technique', duree: '4 mois', responsable: 'M. Diop', budget: 3200000, dateDebut: '2026-03-01', dateFin: '2026-07-01', statut: 'EN_COURS', year: 2026, createdAt: ts(2, 1), updatedAt: ts(2, 1) },
    { id: uuid(), nom: 'Gestion de projet', domaine: 'Management', duree: '2 mois', responsable: 'M. Ba', budget: 1500000, dateDebut: '2026-04-01', dateFin: '2026-06-01', statut: 'PLANIFIEE', year: 2026, createdAt: ts(3, 1), updatedAt: ts(3, 1) },
    { id: uuid(), nom: 'Agriculture durable', domaine: 'Agriculture', duree: '5 mois', responsable: 'Mme Fall', budget: 2000000, dateDebut: '2026-01-10', dateFin: '2026-06-10', statut: 'EN_COURS', year: 2026, createdAt: ts(0, 10), updatedAt: ts(0, 10) },
    { id: uuid(), nom: 'Peche et transformation', domaine: 'Peche', duree: '3 mois', responsable: 'M. Coly', budget: 1700000, dateDebut: '2025-09-01', dateFin: '2025-12-01', statut: 'TERMINEE', year: 2025, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Entrepreneuriat jeunes', domaine: 'Business', duree: '2 mois', responsable: 'Mme Sow', budget: 2200000, dateDebut: '2026-05-01', dateFin: '2026-07-01', statut: 'PLANIFIEE', year: 2026, createdAt: ts(4, 1), updatedAt: ts(4, 1) },
    { id: uuid(), nom: 'Plomberie moderne', domaine: 'Technique', duree: '4 mois', responsable: 'M. Camara', budget: 1900000, dateDebut: '2026-02-15', dateFin: '2026-06-15', statut: 'EN_COURS', year: 2026, createdAt: ts(1, 15), updatedAt: ts(1, 15) },
  ];

  // ─── JEUNES ──────────────────────────────────────────────
  const jeunes = [
    { id: uuid(), nom: 'Sow', prenom: 'Abdou', cni: 'CNI-2024-0001', telephone: '+221770001001', adresse: 'Quartier Escale', niveauEtude: 'Bac', sexe: 'M', dateNaiss: '2002-05-14', year: 2026, formations: [{ formationId: formations[0].id, dateInscription: '2026-01-15', tauxAssiduite: 92, statutFinal: 'CERTIFIE', presences: 55, absences: 5 }], createdAt: ts(0, 15), updatedAt: ts(0, 15) },
    { id: uuid(), nom: 'Sy', prenom: 'Amina', cni: 'CNI-2024-0002', telephone: '+221770001002', adresse: 'Rue Principale', niveauEtude: 'BEPC', sexe: 'F', dateNaiss: '2003-08-22', year: 2026, formations: [{ formationId: formations[1].id, dateInscription: '2026-02-01', tauxAssiduite: 88, statutFinal: 'EN_COURS', presences: 44, absences: 6 }], createdAt: ts(1, 1), updatedAt: ts(1, 1) },
    { id: uuid(), nom: 'Diatta', prenom: 'Paul', cni: 'CNI-2024-0003', telephone: '+221770001003', adresse: 'Quartier Pecheur', niveauEtude: 'CEPE', sexe: 'M', dateNaiss: '2001-12-03', year: 2026, formations: [{ formationId: formations[2].id, dateInscription: '2026-03-01', tauxAssiduite: 95, statutFinal: 'EN_COURS', presences: 38, absences: 2 }], createdAt: ts(2, 1), updatedAt: ts(2, 1) },
    { id: uuid(), nom: 'Camara', prenom: 'Mariama', cni: 'CNI-2024-0004', telephone: '+221770001004', adresse: 'Quartier Commerce', niveauEtude: 'Bac+2', sexe: 'F', dateNaiss: '2000-03-18', year: 2026, formations: [{ formationId: formations[3].id, dateInscription: '2026-04-01', tauxAssiduite: 0, statutFinal: 'EN_ATTENTE', presences: 0, absences: 0 }], createdAt: ts(3, 1), updatedAt: ts(3, 1) },
    { id: uuid(), nom: 'Sane', prenom: 'Ousmane', cni: 'CNI-2024-0005', telephone: '+221770001005', adresse: 'Rue du Marche', niveauEtude: 'CEPE', sexe: 'M', dateNaiss: '2004-07-11', year: 2026, formations: [{ formationId: formations[4].id, dateInscription: '2026-01-10', tauxAssiduite: 78, statutFinal: 'EN_COURS', presences: 47, absences: 13 }], createdAt: ts(0, 10), updatedAt: ts(0, 10) },
    { id: uuid(), nom: 'Badji', prenom: 'Sophie', cni: 'CNI-2024-0006', telephone: '+221770001006', adresse: 'Quartier Nord', niveauEtude: 'Bac', sexe: 'F', dateNaiss: '2002-11-25', year: 2026, formations: [{ formationId: formations[7].id, dateInscription: '2026-02-15', tauxAssiduite: 90, statutFinal: 'EN_COURS', presences: 36, absences: 4 }], createdAt: ts(1, 15), updatedAt: ts(1, 15) },
    { id: uuid(), nom: 'Manga', prenom: 'Youssou', cni: 'CNI-2024-0007', telephone: '+221770001007', adresse: 'Quartier Ancien', niveauEtude: 'Aucun', sexe: 'M', dateNaiss: '2005-02-14', year: 2026, formations: [{ formationId: formations[0].id, dateInscription: '2026-01-15', tauxAssiduite: 85, statutFinal: 'CERTIFIE', presences: 51, absences: 9 }], createdAt: ts(0, 15), updatedAt: ts(0, 15) },
    { id: uuid(), nom: 'Coly', prenom: 'Esther', cni: 'CNI-2024-0008', telephone: '+221770001008', adresse: 'Rue de la Plage', niveauEtude: 'BEPC', sexe: 'F', dateNaiss: '2003-06-30', year: 2026, formations: [{ formationId: formations[5].id, dateInscription: '2025-09-01', tauxAssiduite: 94, statutFinal: 'CERTIFIE', presences: 66, absences: 4 }], createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Sambou', prenom: 'Ibrahima', cni: 'CNI-2024-0009', telephone: '+221770001009', adresse: 'Quartier Mission', niveauEtude: 'Bac', sexe: 'M', dateNaiss: '2001-09-05', year: 2026, formations: [], createdAt: ts(0, 5), updatedAt: ts(0, 5) },
    { id: uuid(), nom: 'Gomis', prenom: 'Claire', cni: 'CNI-2024-0010', telephone: '+221770001010', adresse: 'Quartier Admin', niveauEtude: 'Bac+3', sexe: 'F', dateNaiss: '1999-04-20', year: 2026, formations: [{ formationId: formations[6].id, dateInscription: '2026-05-01', tauxAssiduite: 0, statutFinal: 'EN_ATTENTE', presences: 0, absences: 0 }], createdAt: ts(4, 1), updatedAt: ts(4, 1) },
  ];

  // ─── ETAT CIVIL ──────────────────────────────────────────
  const etatCivil = [
    { id: uuid(), type: 'naissance', typeDocument: 'Acte de naissance', numero: 'EC-2026-001', statut: 'DELIVREE', demandeurNom: 'Amadou Sow', demandeurTelephone: '+221771000001', contribuableId: null, exemplaires: 2, montant: 2000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(0, 10), updatedAt: ts(0, 10) },
    { id: uuid(), type: 'mariage', typeDocument: 'Acte de mariage', numero: 'EC-2026-002', statut: 'DELIVREE', demandeurNom: 'Awa Sy', demandeurTelephone: '+221771000002', contribuableId: null, exemplaires: 3, montant: 5000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(1, 14), updatedAt: ts(1, 14) },
    { id: uuid(), type: 'deces', typeDocument: 'Acte de deces', numero: 'EC-2026-003', statut: 'DELIVREE', demandeurNom: 'Marie Diatta', demandeurTelephone: '+221771000004', contribuableId: null, exemplaires: 2, montant: 3000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(2, 5), updatedAt: ts(2, 5) },
    { id: uuid(), type: 'residence', typeDocument: 'Certificat de residence', numero: 'EC-2026-004', statut: 'EN_ATTENTE', demandeurNom: 'Ousmane Camara', demandeurTelephone: '+221771000005', contribuableId: null, exemplaires: 1, montant: 1000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(3, 20), updatedAt: ts(3, 20) },
    { id: uuid(), type: 'naissance', typeDocument: 'Acte de naissance', numero: 'EC-2026-005', statut: 'DELIVREE', demandeurNom: 'Fatou Sane', demandeurTelephone: '+221771000006', contribuableId: null, exemplaires: 2, montant: 2000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(2, 15), updatedAt: ts(2, 15) },
    { id: uuid(), type: 'naissance', typeDocument: 'Acte de naissance', numero: 'EC-2026-006', statut: 'REJETEE', demandeurNom: 'Jean Sambou', demandeurTelephone: '+221771000007', contribuableId: null, exemplaires: 1, montant: 2000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(1, 28), updatedAt: ts(1, 28) },
    { id: uuid(), type: 'residence', typeDocument: 'Certificat de residence', numero: 'EC-2026-007', statut: 'DELIVREE', demandeurNom: 'Aissatou Badji', demandeurTelephone: '+221771000008', contribuableId: null, exemplaires: 1, montant: 1000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(3, 10), updatedAt: ts(3, 10) },
    { id: uuid(), type: 'mariage', typeDocument: 'Acte de mariage', numero: 'EC-2026-008', statut: 'EN_ATTENTE', demandeurNom: 'Pierre Coly', demandeurTelephone: '+221771000009', contribuableId: null, exemplaires: 3, montant: 5000, agent: 'Agent Etat Civil', year: 2026, createdAt: ts(3, 25), updatedAt: ts(3, 25) },
  ];

  // ─── URBANISME ───────────────────────────────────────────
  const urbanisme = [
    { id: uuid(), numero: 'URB-2026-001', type: 'permis-construire', statut: 'VALIDE', montant: 75000, demandeurNom: 'Ibrahima Ndiaye', demandeurTelephone: '+221771000003', demandeurAdresse: 'Avenue de la Republique', description: 'Construction villa R+1', surface: 200, localisation: 'Quartier Extension', year: 2026, createdAt: ts(0, 5), updatedAt: ts(1, 10) },
    { id: uuid(), numero: 'URB-2026-002', type: 'permis-construire', statut: 'EN_ATTENTE', montant: 60000, demandeurNom: 'Ousmane Sane', demandeurTelephone: '+221771000011', demandeurAdresse: 'Quartier Nouveau', description: 'Construction maison', surface: 150, localisation: 'Quartier Nouveau', year: 2026, createdAt: ts(1, 15), updatedAt: ts(1, 15) },
    { id: uuid(), numero: 'URB-2026-003', type: 'autorisation-travaux', statut: 'VALIDE', montant: 25000, demandeurNom: 'Khady Dieme', demandeurTelephone: '+221771000012', demandeurAdresse: 'Rue des Artisans', description: 'Extension atelier', surface: 80, localisation: 'Zone Artisanale', year: 2026, createdAt: ts(0, 20), updatedAt: ts(1, 5) },
    { id: uuid(), numero: 'URB-2026-004', type: 'certificat-conformite', statut: 'EN_ATTENTE', montant: 15000, demandeurNom: 'Aminata Kande', demandeurTelephone: '+221771000016', demandeurAdresse: 'Quartier Marchand', description: 'Conformite boutique', surface: 40, localisation: 'Marche Central', year: 2026, createdAt: ts(2, 10), updatedAt: ts(2, 10) },
    { id: uuid(), numero: 'URB-2026-005', type: 'permis-construire', statut: 'REJETE', montant: 100000, demandeurNom: 'Sekou Tamba', demandeurTelephone: '+221771000015', demandeurAdresse: 'Route Nationale', description: 'Entrepot logistique', surface: 500, localisation: 'Zone Industrielle', year: 2026, createdAt: ts(1, 8), updatedAt: ts(2, 20) },
    { id: uuid(), numero: 'URB-2026-006', type: 'permis-construire', statut: 'VALIDE', montant: 55000, demandeurNom: 'Bakary Kone', demandeurTelephone: '+221771000019', demandeurAdresse: 'Quartier Sud', description: 'Ferme avicole', surface: 300, localisation: 'Zone Rurale', year: 2026, createdAt: ts(0, 25), updatedAt: ts(1, 28) },
    { id: uuid(), numero: 'URB-2026-007', type: 'autorisation-travaux', statut: 'VALIDE', montant: 20000, demandeurNom: 'Moustapha Faye', demandeurTelephone: '+221771000017', demandeurAdresse: 'Quartier Extension', description: 'Renovation facade', surface: 0, localisation: 'Zone Urbaine', year: 2026, createdAt: ts(2, 18), updatedAt: ts(3, 2) },
    { id: uuid(), numero: 'URB-2026-008', type: 'permis-construire', statut: 'EN_ATTENTE', montant: 80000, demandeurNom: 'Rokhaya Sow', demandeurTelephone: '+221771000020', demandeurAdresse: 'Avenue Lamine', description: 'Immeuble commercial', surface: 250, localisation: 'Zone Commerciale', year: 2026, createdAt: ts(3, 5), updatedAt: ts(3, 5) },
  ];

  // ─── MARCHE PLACES ───────────────────────────────────────
  const marchePlaces = [
    { id: uuid(), numero: 'PLC-001', type: 'Etalage', zone: 'Zone A', occupantId: null, activite: 'Vente poisson frais', tarif: 3000, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-002', type: 'Etalage', zone: 'Zone A', occupantId: null, activite: 'Vente legumes', tarif: 2500, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-003', type: 'Boutique', zone: 'Zone B', occupantId: null, activite: 'Vente tissus', tarif: 8000, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-004', type: 'Etalage', zone: 'Zone A', occupantId: null, activite: 'Vente fruits', tarif: 2000, periode: 'mensuel', statut: 'LIBRE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-005', type: 'Boutique', zone: 'Zone B', occupantId: null, activite: 'Vente quincaillerie', tarif: 12000, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-006', type: 'Etalage', zone: 'Zone C', occupantId: null, activite: 'Vente viande', tarif: 4000, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-007', type: 'Boutique', zone: 'Zone B', occupantId: null, activite: 'Pharmacie traditionnelle', tarif: 6000, periode: 'mensuel', statut: 'OCCUPEE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'PLC-008', type: 'Etalage', zone: 'Zone C', occupantId: null, activite: 'Veste cereales', tarif: 3500, periode: 'mensuel', statut: 'LIBRE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  const marchePayments = [
    { id: uuid(), numeroRecu: 'MP-2026-001', placeId: marchePlaces[0].id, datePaiement: ts(0, 5), mois: 'Janvier 2026', montant: 3000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(0, 5), updatedAt: ts(0, 5) },
    { id: uuid(), numeroRecu: 'MP-2026-002', placeId: marchePlaces[1].id, datePaiement: ts(0, 5), mois: 'Janvier 2026', montant: 2500, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(0, 5), updatedAt: ts(0, 5) },
    { id: uuid(), numeroRecu: 'MP-2026-003', placeId: marchePlaces[2].id, datePaiement: ts(0, 8), mois: 'Janvier 2026', montant: 8000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(0, 8), updatedAt: ts(0, 8) },
    { id: uuid(), numeroRecu: 'MP-2026-004', placeId: marchePlaces[0].id, datePaiement: ts(1, 3), mois: 'Fevrier 2026', montant: 3000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(1, 3), updatedAt: ts(1, 3) },
    { id: uuid(), numeroRecu: 'MP-2026-005', placeId: marchePlaces[4].id, datePaiement: ts(1, 5), mois: 'Fevrier 2026', montant: 12000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(1, 5), updatedAt: ts(1, 5) },
    { id: uuid(), numeroRecu: 'MP-2026-006', placeId: marchePlaces[5].id, datePaiement: ts(2, 2), mois: 'Mars 2026', montant: 4000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(2, 2), updatedAt: ts(2, 2) },
    { id: uuid(), numeroRecu: 'MP-2026-007', placeId: marchePlaces[6].id, datePaiement: ts(2, 10), mois: 'Mars 2026', montant: 6000, statut: 'EN_ATTENTE', agent: 'Agent Marche', year: 2026, createdAt: ts(2, 10), updatedAt: ts(2, 10) },
    { id: uuid(), numeroRecu: 'MP-2026-008', placeId: marchePlaces[2].id, datePaiement: ts(3, 1), mois: 'Avril 2026', montant: 8000, statut: 'PAYE', agent: 'Agent Marche', year: 2026, createdAt: ts(3, 1), updatedAt: ts(3, 1) },
  ];

  // ─── MOTOS ───────────────────────────────────────────────
  const motos = [
    { id: uuid(), immatriculation: 'DK-2026-001', marque: 'Yamaha', modele: 'YBR 125', proprietaireNom: 'Amadou Sow', proprietaireCNI: 'SN-2024-001', telephone: '+221771000001', annee: 2026, statut: 'ACTIVE', enRetard: false, montantPenalite: 0, year: 2026, createdAt: ts(0, 3), updatedAt: ts(0, 3) },
    { id: uuid(), immatriculation: 'DK-2026-002', marque: 'Honda', modele: 'CB 125', proprietaireNom: 'Ousmane Camara', proprietaireCNI: 'SN-2024-005', telephone: '+221771000005', annee: 2026, statut: 'ACTIVE', enRetard: false, montantPenalite: 0, year: 2026, createdAt: ts(0, 5), updatedAt: ts(0, 5) },
    { id: uuid(), immatriculation: 'DK-2026-003', marque: 'Suzuki', modele: 'GN 125', proprietaireNom: 'Sekou Tamba', proprietaireCNI: 'SN-2024-015', telephone: '+221771000015', annee: 2026, statut: 'ACTIVE', enRetard: true, montantPenalite: 250, year: 2026, createdAt: ts(0, 8), updatedAt: ts(0, 8) },
    { id: uuid(), immatriculation: 'DK-2026-004', marque: 'Yamaha', modele: 'Crypton', proprietaireNom: 'Abdoulaye Sene', proprietaireCNI: 'SN-2024-011', telephone: '+221771000011', annee: 2026, statut: 'ACTIVE', enRetard: false, montantPenalite: 0, year: 2026, createdAt: ts(1, 10), updatedAt: ts(1, 10) },
    { id: uuid(), immatriculation: 'DK-2026-005', marque: 'Honda', modele: 'Dream', proprietaireNom: 'Moustapha Faye', proprietaireCNI: 'SN-2024-017', telephone: '+221771000017', annee: 2026, statut: 'ACTIVE', enRetard: false, montantPenalite: 0, year: 2026, createdAt: ts(1, 15), updatedAt: ts(1, 15) },
    { id: uuid(), immatriculation: 'DK-2025-010', marque: 'TVS', modele: 'HLX 125', proprietaireNom: 'Jean Sambou', proprietaireCNI: 'SN-2024-007', telephone: '+221771000007', annee: 2025, statut: 'INACTIVE', enRetard: true, montantPenalite: 500, year: 2025, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  const motoPayments = [
    { id: uuid(), motoId: motos[0].id, numeroRecu: 'MR-2026-001', datePaiement: ts(0, 10), mois: 'Janvier 2026', montant: 1000, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(0, 10), updatedAt: ts(0, 10) },
    { id: uuid(), motoId: motos[0].id, numeroRecu: 'MR-2026-002', datePaiement: ts(1, 8), mois: 'Fevrier 2026', montant: 1000, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(1, 8), updatedAt: ts(1, 8) },
    { id: uuid(), motoId: motos[1].id, numeroRecu: 'MR-2026-003', datePaiement: ts(0, 12), mois: 'Janvier 2026', montant: 1000, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(0, 12), updatedAt: ts(0, 12) },
    { id: uuid(), motoId: motos[2].id, numeroRecu: 'MR-2026-004', datePaiement: ts(0, 15), mois: 'Janvier 2026', montant: 1250, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(0, 15), updatedAt: ts(0, 15) },
    { id: uuid(), motoId: motos[3].id, numeroRecu: 'MR-2026-005', datePaiement: ts(2, 5), mois: 'Mars 2026', montant: 1000, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(2, 5), updatedAt: ts(2, 5) },
    { id: uuid(), motoId: motos[4].id, numeroRecu: 'MR-2026-006', datePaiement: ts(3, 3), mois: 'Avril 2026', montant: 1000, statut: 'PAYE', agent: 'Agent Motos', year: 2026, createdAt: ts(3, 3), updatedAt: ts(3, 3) },
  ];

  // ─── QUAI DE PECHE ───────────────────────────────────────
  const pecheurs = [
    { id: uuid(), nom: 'Sow', prenom: 'Amadou', cni: 'SN-2024-001', telephone: '+221771000001', adresse: 'Quartier Pecheur', type: 'Artisanal', dateInscription: '2025-06-01', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Diatta', prenom: 'Pierre', cni: 'SN-2024-009', telephone: '+221771000009', adresse: 'Rue de la Plage', type: 'Artisanal', dateInscription: '2025-07-15', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Coly', prenom: 'Jean', cni: 'SN-2024-009', telephone: '+221771000009', adresse: 'Quartier Escale', type: 'Semi-industriel', dateInscription: '2025-08-01', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Manga', prenom: 'Oumar', cni: 'SN-2024-010', telephone: '+221771000010', adresse: 'Quartier Ancien', type: 'Artisanal', dateInscription: '2025-09-10', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), nom: 'Sambou', prenom: 'Paul', cni: 'SN-2024-007', telephone: '+221771000007', adresse: 'Quartier Mission', type: 'Artisanal', dateInscription: '2026-01-05', statut: 'INACTIF', year: 2026, createdAt: ts(0, 5), updatedAt: ts(0, 5) },
  ];

  const embarcations = [
    { id: uuid(), numero: 'EMB-001', type: 'Pirogue', longueur: 8, materiau: 'Bois', proprietaireId: pecheurs[0].id, proprietaireNom: 'Amadou Sow', capacite: 4, moteur: false, puissanceMoteur: 0, dateEnregistrement: '2025-06-01', statut: 'ACTIVE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'EMB-002', type: 'Pirogue', longueur: 10, materiau: 'Bois', proprietaireId: pecheurs[1].id, proprietaireNom: 'Pierre Diatta', capacite: 6, moteur: true, puissanceMoteur: 15, dateEnregistrement: '2025-07-15', statut: 'ACTIVE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'EMB-003', type: 'Bateau', longueur: 15, materiau: 'Fibre', proprietaireId: pecheurs[2].id, proprietaireNom: 'Jean Coly', capacite: 12, moteur: true, puissanceMoteur: 75, dateEnregistrement: '2025-08-01', statut: 'ACTIVE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), numero: 'EMB-004', type: 'Pirogue', longueur: 7, materiau: 'Bois', proprietaireId: pecheurs[3].id, proprietaireNom: 'Oumar Manga', capacite: 3, moteur: false, puissanceMoteur: 0, dateEnregistrement: '2025-09-10', statut: 'ACTIVE', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  const commissions = [
    { id: uuid(), numero: 'COM-2026-001', pecheurId: pecheurs[0].id, pecheurNom: 'Amadou Sow', embarcationId: embarcations[0].id, datePeche: ts(0, 12), heureDepart: '05:00', heureRetour: '14:00', typePeche: 'Petite seine', espece: 'Sardines', poids: 150, prixKg: 300, montant: 45000, statut: 'PAYE', year: 2026, createdAt: ts(0, 12), updatedAt: ts(0, 12) },
    { id: uuid(), numero: 'COM-2026-002', pecheurId: pecheurs[1].id, pecheurNom: 'Pierre Diatta', embarcationId: embarcations[1].id, datePeche: ts(0, 15), heureDepart: '04:30', heureRetour: '16:00', typePeche: 'Ligne', espece: 'Thon', poids: 80, prixKg: 800, montant: 64000, statut: 'PAYE', year: 2026, createdAt: ts(0, 15), updatedAt: ts(0, 15) },
    { id: uuid(), numero: 'COM-2026-003', pecheurId: pecheurs[2].id, pecheurNom: 'Jean Coly', embarcationId: embarcations[2].id, datePeche: ts(1, 5), heureDepart: '03:00', heureRetour: '18:00', typePeche: 'Chalut', espece: 'Crevettes', poids: 200, prixKg: 1200, montant: 240000, statut: 'PAYE', year: 2026, createdAt: ts(1, 5), updatedAt: ts(1, 5) },
    { id: uuid(), numero: 'COM-2026-004', pecheurId: pecheurs[0].id, pecheurNom: 'Amadou Sow', embarcationId: embarcations[0].id, datePeche: ts(1, 20), heureDepart: '05:30', heureRetour: '12:00', typePeche: 'Petite seine', espece: 'Sardines', poids: 100, prixKg: 300, montant: 30000, statut: 'EN_ATTENTE', year: 2026, createdAt: ts(1, 20), updatedAt: ts(1, 20) },
    { id: uuid(), numero: 'COM-2026-005', pecheurId: pecheurs[3].id, pecheurNom: 'Oumar Manga', embarcationId: embarcations[3].id, datePeche: ts(2, 10), heureDepart: '06:00', heureRetour: '11:00', typePeche: 'Ligne', espece: 'Maquereau', poids: 60, prixKg: 500, montant: 30000, statut: 'PAYE', year: 2026, createdAt: ts(2, 10), updatedAt: ts(2, 10) },
    { id: uuid(), numero: 'COM-2026-006', pecheurId: pecheurs[2].id, pecheurNom: 'Jean Coly', embarcationId: embarcations[2].id, datePeche: ts(3, 1), heureDepart: '02:00', heureRetour: '20:00', typePeche: 'Chalut', espece: 'Cephalopodes', poids: 120, prixKg: 1500, montant: 180000, statut: 'PAYE', year: 2026, createdAt: ts(3, 1), updatedAt: ts(3, 1) },
    { id: uuid(), numero: 'COM-2026-007', pecheurId: pecheurs[1].id, pecheurNom: 'Pierre Diatta', embarcationId: embarcations[1].id, datePeche: ts(3, 15), heureDepart: '04:00', heureRetour: '15:00', typePeche: 'Ligne', espece: 'Thon', poids: 95, prixKg: 800, montant: 76000, statut: 'EN_ATTENTE', year: 2026, createdAt: ts(3, 15), updatedAt: ts(3, 15) },
  ];

  const camions = [
    { id: uuid(), immatriculation: 'DK-TRK-001', proprietaireNom: 'Sekou Tamba', telephone: '+221771000015', type: 'Camion frigorifique', capacite: 5, dateEnregistrement: '2025-10-01', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), immatriculation: 'DK-TRK-002', proprietaireNom: 'Ibrahima Ndiaye', telephone: '+221771000003', type: 'Camion benne', capacite: 8, dateEnregistrement: '2025-11-15', statut: 'ACTIF', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  const expeditions = [
    { id: uuid(), numero: 'EXP-2026-001', commissionId: commissions[0].id, camionId: camions[0].id, destination: 'Dakar', dateExpedition: ts(0, 13), espece: 'Sardines', poids: 150, prixVente: 45000, transporteur: 'Sekou Tamba', statut: 'LIVREE', year: 2026, createdAt: ts(0, 13), updatedAt: ts(0, 13) },
    { id: uuid(), numero: 'EXP-2026-002', commissionId: commissions[2].id, camionId: camions[0].id, destination: 'Ziguinchor', dateExpedition: ts(1, 6), espece: 'Crevettes', poids: 200, prixVente: 280000, transporteur: 'Sekou Tamba', statut: 'LIVREE', year: 2026, createdAt: ts(1, 6), updatedAt: ts(1, 6) },
    { id: uuid(), numero: 'EXP-2026-003', commissionId: commissions[5].id, camionId: camions[1].id, destination: 'Dakar', dateExpedition: ts(3, 2), espece: 'Cephalopodes', poids: 120, prixVente: 200000, transporteur: 'Ibrahima Ndiaye', statut: 'EN_TRANSIT', year: 2026, createdAt: ts(3, 2), updatedAt: ts(3, 2) },
  ];

  // ─── NOTIFICATIONS ───────────────────────────────────────
  const notifications = [
    { id: uuid(), userId: 'system', type: 'info', titre: 'Nouvelle annee fiscale', message: 'L\'annee fiscale 2026 est ouverte. Pensez a mettre a jour les tarifs.', montant: null, contribuable: null, agent: null, lu: true, timestamp: ts(0, 1) },
    { id: uuid(), userId: 'system', type: 'success', titre: 'Paiement recu', message: 'Paiement de 1000 FCFA recu pour la moto DK-2026-001', montant: 1000, contribuable: 'Amadou Sow', agent: 'Agent Motos', lu: true, timestamp: ts(0, 10) },
    { id: uuid(), userId: 'system', type: 'warning', titre: 'Retard de paiement', message: 'La moto DK-2026-003 (Sekou Tamba) est en retard de paiement', montant: 250, contribuable: 'Sekou Tamba', agent: null, lu: false, timestamp: ts(1, 1) },
    { id: uuid(), userId: 'system', type: 'success', titre: 'Commission enregistree', message: 'Commission COM-2026-003 enregistree - 200kg de crevettes', montant: 240000, contribuable: 'Jean Coly', agent: 'Agent Quai', lu: false, timestamp: ts(1, 5) },
    { id: uuid(), userId: 'system', type: 'info', titre: 'Formation terminee', message: 'La formation Informatique de base est terminee avec succes', montant: null, contribuable: null, agent: null, lu: true, timestamp: ts(3, 15) },
    { id: uuid(), userId: 'system', type: 'warning', titre: 'Dossier urbanisme en attente', message: 'Le dossier URB-2026-002 est en attente de validation', montant: 60000, contribuable: 'Ousmane Sane', agent: null, lu: false, timestamp: ts(1, 15) },
    { id: uuid(), userId: 'system', type: 'success', titre: 'Transaction enregistree', message: 'Transaction TX-2026-015 - Taxe fonciere - 25000 FCFA', montant: 25000, contribuable: 'Awa Sy', agent: 'Fatou Sarr', lu: true, timestamp: ts(2, 8) },
    { id: uuid(), userId: 'system', type: 'error', titre: 'Paiement annule', message: 'Le paiement MP-2026-007 a ete annule - Place de marche PLC-007', montant: 6000, contribuable: null, agent: 'Agent Marche', lu: false, timestamp: ts(2, 12) },
  ];

  // ─── SETTINGS ────────────────────────────────────────────
  const settingsTarifs = [
    { id: uuid(), categorie: 'ETAT_CIVIL', service: 'Acte de naissance', tarif: 2000, unite: 'exemplaire', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'ETAT_CIVIL', service: 'Acte de mariage', tarif: 5000, unite: 'exemplaire', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'ETAT_CIVIL', service: 'Acte de deces', tarif: 3000, unite: 'exemplaire', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'ETAT_CIVIL', service: 'Certificat de residence', tarif: 1000, unite: 'exemplaire', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'URBANISME', service: 'Permis de construire', tarif: 50000, unite: 'dossier', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'URBANISME', service: 'Autorisation travaux', tarif: 20000, unite: 'dossier', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'MOTO', service: 'Immatriculation', tarif: 5000, unite: 'vehicule', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'MOTO', service: 'Taxe mensuelle', tarif: 1000, unite: 'mois', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'MOTO', service: 'Penalite retard', tarif: 250, unite: 'mois', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), categorie: 'QUAI_PECHE', service: 'Commission de peche', tarif: 10, unite: '% du poids', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  const settingsPenalites = [
    { id: uuid(), type: 'RETARD_PAIEMENT_MOTO', montant: 250, description: 'Penalite mensuelle pour retard de paiement moto', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), type: 'RETARD_PAIEMENT_MARCHE', montant: 1000, description: 'Penalite pour retard de paiement place de marche', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
    { id: uuid(), type: 'TRAVAUX_SANS_AUTORISATION', montant: 100000, description: 'Amende pour travaux sans autorisation', year: 2026, createdAt: ts(0, 1), updatedAt: ts(0, 1) },
  ];

  // ─── BUDGET ──────────────────────────────────────────────
  const budgetLignes = [
    { id: uuid(), code: 'B01', libelle: 'Fonctionnement general', description: 'Depenses de fonctionnement', prevu: 5000000, depense: 3200000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B02', libelle: 'Personnel', description: 'Salaires et charges', prevu: 15000000, depense: 12000000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B03', libelle: 'Equipement', description: 'Achat materiel et equipement', prevu: 8000000, depense: 4500000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B04', libelle: 'Infrastructure', description: 'Travaux et infrastructures', prevu: 20000000, depense: 11000000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B05', libelle: 'Formation', description: 'Formations professionnelles', prevu: 3000000, depense: 1800000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B06', libelle: 'Sante publique', description: 'Programmes de sante', prevu: 6000000, depense: 2500000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B07', libelle: 'Education', description: 'Bourses et education', prevu: 4000000, depense: 1200000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B08', libelle: 'Securite', description: 'Securite et ordre public', prevu: 5000000, depense: 3800000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B09', libelle: 'Environnement', description: 'Salubrite et environnement', prevu: 3500000, depense: 2100000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
    { id: uuid(), code: 'B10', libelle: 'Sport et culture', description: 'Activites sportives et culturelles', prevu: 2500000, depense: 900000, year: 2026, createdAt: ts(0, 1), updatedAt: ts(2, 15) },
  ];

  const budgetDemandes = [
    { id: uuid(), service: 'Service Technique', description: 'Achat materiaux reparation route', montant: 2500000, statut: 'APPROUVE', motif: null, createdAt: ts(1, 5), updatedAt: ts(1, 10) },
    { id: uuid(), service: 'Etat Civil', description: 'Achat registres etat civil', montant: 350000, statut: 'APPROUVE', motif: null, createdAt: ts(1, 12), updatedAt: ts(1, 15) },
    { id: uuid(), service: 'Marche', description: 'Reparation toiture marche central', montant: 1800000, statut: 'APPROUVE', motif: null, createdAt: ts(1, 20), updatedAt: ts(1, 25) },
    { id: uuid(), service: 'Urbanisme', description: 'Achat logiciel SIG', montant: 4000000, statut: 'EN_ATTENTE', motif: null, createdAt: ts(2, 3), updatedAt: ts(2, 3) },
    { id: uuid(), service: 'Education', description: 'Bourses etudiants meriteux', montant: 1200000, statut: 'EN_ATTENTE', motif: null, createdAt: ts(2, 8), updatedAt: ts(2, 8) },
    { id: uuid(), service: 'Sante', description: 'Achat medicaments dispensaire', montant: 800000, statut: 'APPROUVE', motif: null, createdAt: ts(2, 15), updatedAt: ts(2, 18) },
    { id: uuid(), service: 'Securite', description: 'Equipement gardiens de nuit', montant: 600000, statut: 'REJETE', motif: 'Budget insuffisant pour ce trimestre', createdAt: ts(2, 20), updatedAt: ts(2, 25) },
    { id: uuid(), service: 'Environnement', description: 'Achat poubelles publiques', montant: 450000, statut: 'APPROUVE', motif: null, createdAt: ts(3, 1), updatedAt: ts(3, 5) },
  ];

  // ─── ASSEMBLE DB ─────────────────────────────────────────
  const db = {
    budgetLignes,
    budgetDemandes,
    formations,
    jeunes,
    etatCivil,
    urbanisme,
    marchePlaces,
    marchePayments,
    motos,
    motoPayments,
    notifications,
    users: [],
    pecheurs,
    embarcations,
    commissions,
    camions,
    expeditions,
    settingsTarifs,
    settingsPenalites,
    settingsPermissions: [],
    backups: [],
  };

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');

  console.log('JSON store seed done');
  console.log(`  Formations: ${formations.length}`);
  console.log(`  Jeunes: ${jeunes.length}`);
  console.log(`  Etat Civil: ${etatCivil.length}`);
  console.log(`  Urbanisme: ${urbanisme.length}`);
  console.log(`  Marche Places: ${marchePlaces.length}`);
  console.log(`  Marche Payments: ${marchePayments.length}`);
  console.log(`  Motos: ${motos.length}`);
  console.log(`  Moto Payments: ${motoPayments.length}`);
  console.log(`  Pecheurs: ${pecheurs.length}`);
  console.log(`  Embarcations: ${embarcations.length}`);
  console.log(`  Commissions: ${commissions.length}`);
  console.log(`  Camions: ${camions.length}`);
  console.log(`  Expeditions: ${expeditions.length}`);
  console.log(`  Notifications: ${notifications.length}`);
  console.log(`  Settings Tarifs: ${settingsTarifs.length}`);
  console.log(`  Settings Penalites: ${settingsPenalites.length}`);
  console.log(`  Budget Lignes: ${budgetLignes.length}`);
  console.log(`  Budget Demandes: ${budgetDemandes.length}`);
}

main().catch(console.error);
