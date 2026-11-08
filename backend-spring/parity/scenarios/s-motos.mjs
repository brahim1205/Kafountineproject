import { C, C2 } from '../ids.mjs';
const P = 'TestPassword123!';
const M = '/api/v1/motos';
const moto = { matricule: 'dk-1234-a', marque: 'Jakarta', modele: 'JK', annee: 2020, proprietaireId: C };
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('fin', 'finances@kafountine.gouv.sn', P);
  },
  steps: [
    { path: M, save: 'motos' },
    { path: `${M}?search=JAKARTA&limit=2` },
    { path: `${M}?search=zzz` },
    { path: `${M}?limit=501&year=2025` },
    { path: `${M}/statistiques` },
    { path: `${M}/configuration?year=2026` },
    { path: `${M}/configuration?x=1` },
    { path: `${M}/paiements` },
    { method: 'POST', path: M, as: 'agent', body: {} },
    { method: 'POST', path: M, as: 'agent', body: { ...moto, annee: 1800, enRetard: 'oui', montantPenalite: -1, prochainPaiement: '', conducteurId: 'x' } },
    { method: 'POST', path: M, as: 'agent', body: { ...moto, proprietaireId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'POST', path: M, as: 'agent', body: { ...moto, conducteurId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'POST', path: M, as: 'agent', save: 'm1', body: { ...moto, couleur: ' Rouge ', permis: 'P-1', statut: 'active', photo: 'x.png', enRetard: true, montantPenalite: 500, prochainPaiement: '2026-01-01', year: 2026 } },
    { method: 'POST', path: M, as: 'agent', body: { ...moto, matricule: 'DK-1234-A ' }, note: 'matricule existant' },
    { method: 'POST', path: M, as: 'agent', body: { ...moto, matricule: 'DK-9', permis: 'P-1' }, note: 'permis existant' },
    { method: 'POST', path: M, as: 'agent', save: 'm2', body: { ...moto, matricule: 'DK-9', conducteurId: C2, annee: '2019', couleur: '' } },
    { method: 'PUT', path: `${M}/{{m1.data.id}}`, as: 'agent', body: { matricule: 'dk-9' } },
    { method: 'PUT', path: `${M}/{{m2.data.id}}`, as: 'agent', body: { permis: 'P-1' } },
    { method: 'PUT', path: `${M}/{{m1.data.id}}`, as: 'agent', body: { enRetard: true, prochainPaiement: '2026-09-01', dernierPaiement: '2026-08-01T10:00:00Z', couleur: '', photo: '', permis: '', montantPenalite: '300', statut: 'suspendue', annee: 2021 } },
    { method: 'PUT', path: `${M}/{{m1.data.id}}`, as: 'agent', body: { conducteurId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'PUT', path: `${M}/00000000-0000-4000-8000-000000000000`, as: 'agent', body: {} },
    { method: 'POST', path: `${M}/{{m2.data.id}}/changement-conducteur`, as: 'agent', body: { conducteurId: C } },
    { method: 'POST', path: `${M}/{{m2.data.id}}/changement-conducteur`, as: 'agent', body: {} },
    { method: 'POST', path: `${M}/{{m2.data.id}}/changement-conducteur`, as: 'agent', body: { conducteurId: C, marque: 'X' } },
    // Paiements
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: {} },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { motoId: '{{m1.data.id}}', montant: 0 } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { motoId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { motoId: '{{m1.data.id}}' }, note: 'en retard : tarif + pénalité' },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { motoId: '{{m1.data.id}}' }, note: 'à jour : tarif' },
    { method: 'POST', path: `${M}/paiements`, as: 'agent', body: { motoId: '{{m2.data.id}}', montant: '1250.5', reference: ' R1 ', mois: ' Octobre 2026 ', year: 2025 } },
    { method: 'POST', path: `${M}/paiements`, as: 'agent', body: { motoId: '{{motos.data.0.id}}', mois: '' } },
    { path: M },
    { path: `${M}/paiements` },
    { path: `${M}/paiements?year=2025` },
    { path: `${M}/statistiques` },
    { path: '/api/v1/dashboard/statistiques' },
  ],
};
