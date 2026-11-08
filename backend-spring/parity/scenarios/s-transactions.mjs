import { C, C2, AGENT } from '../ids.mjs';
const P = 'TestPassword123!';
const T = '/api/v1/transactions';
const ticket = { contribuableId: C, type: 'etat-civil', montant: 500 };
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('finances', 'finances@kafountine.gouv.sn', P);
    await login('etatcivil', 'etatcivil@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${T}/categories` },
    { path: `${T}/categories/etat-civil/services` },
    { path: `${T}/categories/inconnue/services` },
    { path: `${T}/categories/%20/services` },
    { path: `${T}/categories-utilisees` },
    { path: `${T}/categories-utilisees?year=2025` },
    { path: `${T}/categories-utilisees?year=abc&x=1` },
    { path: T },
    { path: `${T}?page=3&limit=7` },
    { path: `${T}?search=TX-2026 permis` },
    { path: `${T}?search=camara` },
    { path: `${T}?search=sn-2024` },
    { path: `${T}?search=SN-2024-005` },
    { path: `${T}?categorie=etat-civil` },
    { path: `${T}?categorie=ETAT_CIVIL&statut=PAYE` },
    { path: `${T}?categorie=Marché&year=2026` },
    { path: `${T}?statut=EN_ATTENTE&limit=300` },
    { path: `${T}?agentId=${AGENT}` },
    { path: `${T}?agentId=pas-un-uuid` },
    { path: `${T}?agentId=00000000-0000-0000-0000-000000000000` },
    { path: `${T}?startDate=2026-01-01&endDate=2026-03-31` },
    { path: `${T}?startDate=2026-02-30` },
    { path: `${T}?startDate=2026-02-32` },
    { path: `${T}?startDate=04/11/2026&limit=301&page=0` },
    { path: `${T}?year=2025` },
    { path: `${T}?startDate=` },
    { path: `${T}/statistiques` },
    { path: `${T}/statistiques?year=2025` },
    { path: `${T}/statistiques`, as: 'agent' },
    { path: `${T}/export`, as: 'finances', raw: true, headers: ['content-type', 'content-disposition'] },
    { path: `${T}/export?categorie=etat-civil&statut=PAYE`, raw: true, headers: ['content-type', 'content-disposition'] },
    { path: `${T}/export?year=2025`, raw: true, headers: ['content-disposition'] },
    { path: `${T}/export?page=1` },
    { path: `${T}/export`, as: 'agent' },
    // Création
    { method: 'POST', path: T, as: 'agent', body: {} },
    { method: 'POST', path: T, as: 'agent', body: { contribuableId: 'x', type: '', montant: -5, quantite: 0, modePaiement: 'CB', statut: 'OK', reference: 'r'.repeat(121) } },
    { method: 'POST', path: T, as: 'agent', body: { ...ticket, montant: undefined } },
    { method: 'POST', path: T, as: 'admin', body: ticket, note: 'admin lecture seule' },
    { method: 'POST', path: T, as: 'agent', save: 't1', body: ticket },
    { method: 'POST', path: T, as: 'agent', save: 't2', body: { ...ticket, categorie: 'MARCHE', service: 'Place', quantite: '3', montant: '1500.5', modePaiement: 'MOBILE_MONEY', statut: 'EN_ATTENTE', date: '2026-03-04', reference: 'ref' } },
    { method: 'POST', path: T, as: 'finances', save: 't3', body: { ...ticket, categorie: '', service: '', date: '2026-05-06T10:20:30.000Z', montant: 0 } },
    { method: 'POST', path: T, as: 'etatcivil', body: { ...ticket, categorie: '', service: '', date: '2026-05-06T10:20:30.000Z', montant: 0 } },
    { method: 'POST', path: T, as: 'agent', body: { ...ticket, contribuableId: '00000000-0000-4000-8000-000000000000' }, note: 'contribuable inexistant' },
    { method: 'POST', path: T, as: 'agent', body: { ...ticket, date: 'pas une date' } },
    { path: `${T}?search=Diff` },
    { path: `${T}?categorie=etat-civil&limit=2` },
    { path: `${T}/statistiques` },
    // Modification
    { method: 'PUT', path: `${T}/{{t1.data.id}}`, as: 'agent', body: { montant: 1 } },
    { method: 'PUT', path: `${T}/{{t1.data.id}}`, as: 'super', body: { montant: 750, statut: 'ANNULE' } },
    { method: 'PUT', path: `${T}/{{t1.data.id}}`, as: 'super', body: { service: 'Seul' } },
    { method: 'PUT', path: `${T}/{{t1.data.id}}`, as: 'super', body: { type: 'urbanisme', quantite: 2, modePaiement: 'CHEQUE' } },
    { method: 'PUT', path: `${T}/{{t2.data.id}}`, as: 'super', body: { type: '', service: '' } },
    { method: 'PUT', path: `${T}/{{t2.data.id}}`, as: 'super', body: { categorie: 'X' } },
    { method: 'PUT', path: `${T}/{{t2.data.id}}`, as: 'super', body: { contribuableId: C2, montant: '12.25' } },
    { method: 'PUT', path: `${T}/00000000-0000-4000-8000-000000000000`, as: 'super', body: { montant: 1 } },
    { method: 'PUT', path: `${T}/abc`, as: 'super', body: { montant: 'x' } },
    // Suppression
    { method: 'DELETE', path: `${T}/{{t3.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${T}/{{t3.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${T}/abc`, as: 'super' },
    { path: `${T}/export?search=TX-2026`, raw: true },
    { path: `${T}/categories-utilisees` },
  ],
};
