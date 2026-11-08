import { C } from '../ids.mjs';
const P = 'TestPassword123!';
const M = '/api/v1/marche';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('fin', 'finances@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${M}/places`, save: 'places' },
    { path: `${M}/places?year=2025` },
    { path: `${M}/paiements` },
    { path: `${M}/statistiques` },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { type: 'T', zone: 'Z', tarif: 100 } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { type: 'T', zone: 'Z', tarif: 100, numeroPlace: '' } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { zone: 'Z', tarif: 100, bad: 1 } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { type: 'T', zone: 'Z', tarif: -1, x: 1 } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { numero: 'D-1', type: 'T', zone: 'Z', tarif: 1, occupantId: '' } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { numero: 'D-1', type: 'T', zone: 'Z', tarif: 1, occupantId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'POST', path: `${M}/places`, as: 'fin', body: { numero: 'D-1', type: 'T', zone: 'Z', tarif: 1 } },
    { method: 'POST', path: `${M}/places`, as: 'agent', save: 'p1', body: { numero: 'D-1', type: 'Étal', zone: 'Nord', tarif: '2500', occupantId: C, activite: ' Légumes ', telephone: '770000000', periode: 'journalier', statut: 'OCCUPEE' } },
    { method: 'POST', path: `${M}/places`, as: 'agent', body: { numeroPlace: 'D-1', type: 'T', zone: 'Z', tarif: 1 }, note: 'doublon' },
    { method: 'POST', path: `${M}/places`, as: 'agent', save: 'p2', body: { numeroPlace: 'D-2', type: 'T', zone: 'Z', tarif: 0, statut: 'DISPONIBLE', year: 2025 } },
    { method: 'PUT', path: `${M}/places/{{p1.data.id}}`, as: 'agent', body: { occupantId: 'abc' } },
    { method: 'PUT', path: `${M}/places/{{p1.data.id}}`, as: 'agent', body: { occupantId: 5 } },
    { method: 'PUT', path: `${M}/places/{{p1.data.id}}`, as: 'agent', body: { occupantId: '', activite: '' } },
    { method: 'PUT', path: `${M}/places/{{p1.data.id}}`, as: 'agent', body: { occupantId: null } },
    { method: 'PUT', path: `${M}/places/{{p1.data.id}}`, as: 'agent', body: { occupantId: C, tarif: 3000, periode: 'mensuel', statut: 'libre', numeroPlace: 'D-1b' } },
    { method: 'PUT', path: `${M}/places/{{p2.data.id}}`, as: 'agent', body: { numeroPlace: 'D-1b', year: 2026 }, note: 'doublon' },
    { method: 'PUT', path: `${M}/places/{{p2.data.id}}`, as: 'agent', body: { year: 2026, type: '', zone: 'Sud' } },
    { method: 'PUT', path: `${M}/places/00000000-0000-4000-8000-000000000000`, as: 'agent', body: {} },
    // Paiements
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: {} },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: 0, periode: 'P', datePaiement: '' } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: 5, periode: 'P', datePaiement: 'x'.repeat(60) } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: 5, periode: 'P', datePaiement: null } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '00000000-0000-4000-8000-000000000000', montant: 5, periode: 'P' } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', save: 'm1', body: { placeId: '{{p1.data.id}}', montant: 1500, periode: '2026-11', statut: 'EN_ATTENTE', datePaiement: '2026-11-02' } },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: '1500.5', periode: '2026-11', reference: ' REF-1 ', datePaiement: 'March 4, 2026' }, note: 'encaisse le paiement en attente' },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: 1500, periode: '2026-11' }, note: 'déjà payé' },
    { method: 'POST', path: `${M}/paiements`, as: 'fin', body: { placeId: '{{p1.data.id}}', montant: 10, periode: '2026-11', statut: 'ANNULE', datePaiement: '04/03/2026' } },
    { method: 'POST', path: `${M}/paiements`, as: 'agent', body: { placeId: '{{p2.data.id}}', montant: 10, periode: '2026-12', datePaiement: '2026-12-01 10:30', year: 2025 } },
    { method: 'POST', path: `${M}/paiements`, as: 'agent', body: { placeId: '{{places.data.0.id}}', montant: 99, periode: 'Novembre 2026' } },
    { path: `${M}/paiements` },
    { path: `${M}/paiements?year=2025` },
    { path: `${M}/places` },
    { path: `${M}/statistiques` },
    { path: '/api/v1/dashboard/statistiques' },
  ],
};
