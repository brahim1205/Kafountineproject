const P = 'TestPassword123!';
const S = '/api/v1/settings';
const Z = '00000000-0000-4000-8000-000000000000';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('finances', 'finances@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${S}/backups` },
    { method: 'POST', path: `${S}/backups`, as: 'super', body: { x: 1 } },
    { method: 'POST', path: `${S}/backups`, note: 'admin lecture seule' },
    { method: 'POST', path: `${S}/backups`, as: 'super', save: 'bk' },
    { path: `${S}/backups`, as: 'super' },
    { path: `${S}/backups/{{bk.data.filename}}/download`, as: 'super', headers: ['content-type', 'content-disposition'] },
    { path: `${S}/backups/backup-2026-01-01_00-00-00-000.json/download`, as: 'super' },
    { path: `${S}/backups/nope.json/download`, as: 'super' },
    { path: `${S}/tarifs`, save: 'tarifs' },
    { path: `${S}/tarifs`, as: 'agent' },
    { path: `${S}/penalites`, as: 'finances', save: 'pen' },
    { path: '/api/v1/public/penalites', as: null },
    { path: `${S}/permissions` },
    { method: 'POST', path: `${S}/tarifs`, as: 'super', body: {} },
    { method: 'POST', path: `${S}/tarifs`, as: 'super', save: 't1', body: { categorie: ' Nouvelle Catégorie ', nom: 'Tarif A', montant: '1500.5', unite: 'acte', description: 'ignorée', actif: false } },
    { method: 'POST', path: `${S}/tarifs`, as: 'super', save: 't2', body: { categorie: 'ETAT CIVIL', nom: 'Tarif B', montant: 0, unite: 'acte' } },
    { method: 'PUT', path: `${S}/tarifs/{{t1.data.id}}`, as: 'super', body: { description: ' Catégorie neuve ', montant: 2000, actif: true, categorie: 'Urbanisme' } },
    { method: 'PUT', path: `${S}/tarifs/{{t2.data.id}}`, as: 'super', body: { nom: '', description: '' } },
    { method: 'PUT', path: `${S}/tarifs/${Z}`, as: 'super', body: {} },
    { method: 'DELETE', path: `${S}/tarifs/{{t2.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${S}/tarifs/{{t2.data.id}}`, as: 'super' },
    { path: `${S}/tarifs` },
    { path: '/api/v1/transactions/categories' },
    { method: 'POST', path: `${S}/penalites`, as: 'super', body: { type: '', montant: -1, delai: '' } },
    { method: 'POST', path: `${S}/penalites`, as: 'super', save: 'p1', body: { type: 'Retard X', description: ' Desc ', montant: 100, delai: '3 jours', actif: false } },
    { method: 'PUT', path: `${S}/penalites/{{p1.data.id}}`, as: 'super', body: { description: '', type: 'Retard Y' } },
    { method: 'DELETE', path: `${S}/penalites/{{p1.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${S}/penalites/${Z}`, as: 'super' },
    { method: 'POST', path: `${S}/permissions`, as: 'super', body: { module: 'Budget', role: 'AGENT', enabled: true } },
    { method: 'POST', path: `${S}/permissions`, as: 'super', body: { module: 'Nouveau module', role: 'SUPERVISEUR', enabled: false } },
    { method: 'POST', path: `${S}/permissions`, as: 'super', body: { module: '', role: 'ROI' } },
    { path: `${S}/permissions` },
    { method: 'POST', path: `${S}/backups/restore`, as: 'super', body: { filename: 'x' } },
    { method: 'POST', path: `${S}/backups/restore`, as: 'super', body: { filename: 'backup-2026-01-01_00-00-00-000.json' } },
    { method: 'POST', path: `${S}/backups/restore`, as: 'super', body: { filename: '{{bk.data.filename}}' } },
    { path: `${S}/backups`, as: 'super' },
    { path: `${S}/penalites` },
    { path: `${S}/permissions` },
    { path: '/api/v1/contribuables?limit=3' },
  ],
};
