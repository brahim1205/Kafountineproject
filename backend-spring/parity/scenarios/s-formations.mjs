const P = 'TestPassword123!';
const Z = '00000000-0000-4000-8000-000000000000';
const f = { nom: 'Couture', domaine: 'Textile', duree: '3 mois', responsable: 'Mme Sow', budget: 150000.5, dateDebut: '2026-03-01', dateFin: '2026-06-01' };
const j = { nom: 'Badji', prenom: 'Ali', cni: 'CNI-D1', telephone: '770000123', sexe: 'M', dateNaiss: '2000-02-30' };
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
  },
  steps: [
    { path: '/api/v1/formations', save: 'fs' }, { path: '/api/v1/formations?year=2025&limit=2' }, { path: '/api/v1/formations/statistiques' }, { path: '/api/v1/formations/statistiques?year=2025' },
    { path: '/api/v1/jeunes', save: 'js' }, { path: '/api/v1/jeunes?search=A&limit=2' }, { path: '/api/v1/jeunes?limit=501' },
    { method: 'POST', path: '/api/v1/formations', as: 'agent', body: {} },
    { method: 'POST', path: '/api/v1/formations', as: 'agent', body: { ...f, budget: -1, dateDebut: '', dateFin: 'x'.repeat(60), statut: 'X' } },
    { method: 'POST', path: '/api/v1/formations', body: f, note: 'admin lecture seule' },
    { method: 'POST', path: '/api/v1/formations', as: 'agent', save: 'f1', body: f },
    { method: 'POST', path: '/api/v1/formations', as: 'super', save: 'f2', body: { ...f, nom: 'Soudure', statut: 'EN_COURS', dateDebut: 'March 4, 2025', dateFin: '04/03/2026', year: 2026 } },
    { method: 'POST', path: '/api/v1/formations', as: 'super', body: { ...f, nom: 'Année déduite', dateDebut: '2024-12-31T23:00:00Z' } },
    { method: 'PUT', path: '/api/v1/formations/{{f1.data.id}}', as: 'agent', body: { nom: '', budget: 10, dateFin: '2026-07-01', statut: 'TERMINEE' } },
    { method: 'PUT', path: '/api/v1/formations/{{f1.data.id}}', as: 'agent', body: { dateDebut: '' } },
    { method: 'PUT', path: `/api/v1/formations/${Z}`, as: 'agent', body: {} },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', body: {} },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', body: { ...j, sexe: 'X', dateNaiss: 'zz' } },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', save: 'j1', body: { ...j, adresse: ' Quai ', niveauEtude: '', photo: 'p.png' } },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', body: { ...j, cni: 'AUTRE' }, note: 'téléphone pris' },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', body: { ...j, telephone: '7' }, note: 'cni pris' },
    { method: 'POST', path: '/api/v1/jeunes', as: 'agent', save: 'j2', body: { ...j, cni: 'CNI-D2', telephone: '770000124', sexe: 'F', year: 2025 } },
    { method: 'POST', path: '/api/v1/jeunes/{{j1.data.id}}/formations/{{f1.data.id}}', as: 'agent' },
    { method: 'POST', path: '/api/v1/jeunes/{{j1.data.id}}/formations/{{f2.data.id}}', as: 'agent' },
    { method: 'POST', path: '/api/v1/jeunes/{{j1.data.id}}/formations/{{f1.data.id}}', as: 'agent', note: 'déjà inscrit' },
    { method: 'POST', path: `/api/v1/jeunes/${Z}/formations/{{f1.data.id}}`, as: 'agent', note: 'jeune inconnu' },
    { method: 'POST', path: '/api/v1/jeunes/a/formations/b', as: 'agent' },
    { path: '/api/v1/jeunes?search=badji' }, { path: '/api/v1/formations' }, { path: '/api/v1/formations/statistiques' },
    { method: 'DELETE', path: '/api/v1/jeunes/{{j2.data.id}}', as: 'agent' },
    { method: 'DELETE', path: '/api/v1/jeunes/{{j2.data.id}}', as: 'super' },
    { method: 'DELETE', path: '/api/v1/jeunes/{{j2.data.id}}', as: 'super' },
    { method: 'DELETE', path: '/api/v1/formations/{{f2.data.id}}', as: 'super' },
    { method: 'DELETE', path: '/api/v1/formations/{{f2.data.id}}', as: 'super' },
    { path: '/api/v1/jeunes' }, { path: '/api/v1/dashboard/statistiques' },
  ],
};
