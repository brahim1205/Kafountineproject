import { C, C2 } from '../ids.mjs';
const P = 'TestPassword123!';
const E = '/api/v1/etat-civil';
const U = '/api/v1/urbanisme';
export default {
  async setup(login) {
    await login('regi', 'regisseur@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
  },
  steps: [
    { path: '/api/v1/etat-civil', as: 'regi' },
    { path: '/api/v1/etat-civil/statistiques', as: 'regi' },
    { path: '/api/v1/etat-civil/types-documents', as: 'regi' },
    { path: '/api/v1/users', as: 'regi' },
    { path: '/api/v1/dashboard/statistiques', as: 'regi' },
    { path: '/api/v1/dashboard/top-contribuables', as: 'regi' },
    { path: '/api/v1/motos', as: 'regi' },
    { path: '/api/v1/marche/places', as: 'regi' },
    { path: '/api/v1/marche/paiements', as: 'regi' },
    { path: '/api/v1/urbanisme', as: 'regi' },
    { path: '/api/v1/formations', as: 'regi' },
    { path: '/api/v1/jeunes', as: 'regi' },
    { path: '/api/v1/transactions', as: 'regi' },
    { path: '/api/v1/transactions/statistiques', as: 'regi' },
    { path: '/api/v1/budget/lignes', as: 'regi' },
    { path: '/api/v1/budget/demandes', as: 'regi' },
    { path: '/api/v1/budget/stats', as: 'regi' },
    { path: '/api/v1/quai-peche/pecheurs', as: 'regi' },
    { path: '/api/v1/quai-peche/embarcations', as: 'regi' },
    { path: '/api/v1/quai-peche/commissions', as: 'regi' },
    { path: '/api/v1/quai-peche/camions', as: 'regi' },
    { path: '/api/v1/quai-peche/expeditions', as: 'regi' },
    { path: '/api/v1/quai-peche/statistiques', as: 'regi' },
    { path: '/api/v1/settings/penalites', as: 'regi' },
    { path: '/api/v1/settings/tarifs', as: 'regi' },
    { path: '/api/v1/audit', as: 'regi' },
    { path: '/api/v1/exports/report-data', as: 'regi' },
    { method: 'POST', path: '/api/v1/users', as: 'regi', body: { email: 'chef@kafountine.gouv.sn', nom: 'A', prenom: 'B', role: 'ADMIN', password: 'MotDePasseSolide123!' }, note: 'rôle interdit' },
    { method: 'POST', path: '/api/v1/users', as: 'regi', save: 'u1', body: { email: 'terrain@kafountine.gouv.sn', nom: 'A', prenom: 'B', role: 'AGENT', password: 'MotDePasseSolide123!' } },
    { method: 'PUT', path: '/api/v1/users/{{u1.data.id}}', as: 'regi', body: { role: 'QUAI_PECHE' } },
    { method: 'PUT', path: '/api/v1/users/{{u1.data.id}}', as: 'regi', body: { role: 'SUPER_ADMIN' } },
    { path: '/api/v1/users', as: 'super', save: 'all' },
    { method: 'DELETE', path: '/api/v1/users/{{u1.data.id}}', as: 'regi' },
    { method: 'POST', path: '/api/v1/etat-civil', as: 'regi', body: {} },
  ],
};
