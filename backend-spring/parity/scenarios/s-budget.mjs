const P = 'TestPassword123!';
const B = '/api/v1/budget';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('fin', 'finances@kafountine.gouv.sn', P);
    await login('finances', 'finances@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${B}/lignes` },
    { path: `${B}/lignes?year=2025` },
    { path: `${B}/lignes`, as: 'agent' },
    { path: `${B}/stats` },
    { path: `${B}/demandes`, save: 'demandes' },
    { method: 'POST', path: `${B}/lignes`, as: 'fin', body: {} },
    { method: 'POST', path: `${B}/lignes`, as: 'fin', body: { code: 'x', libelle: 'L', prevu: -1, description: 5 } },
    { method: 'POST', path: `${B}/lignes`, as: 'fin', save: 'l1', body: { code: ' bud-01 ', libelle: ' Voirie ', prevu: '1000000', depense: 2500.5, description: null } },
    { method: 'POST', path: `${B}/lignes`, as: 'fin', body: { code: 'BUD-01', libelle: 'X', prevu: 1 }, note: 'doublon' },
    { method: 'POST', path: `${B}/lignes`, as: 'fin', save: 'l2', body: { code: 'bud-02', libelle: 'Eclairage', prevu: 0, description: ' Lampadaires ', year: 2025 } },
    { method: 'PUT', path: `${B}/lignes/{{l2.data.id}}`, as: 'fin', body: { code: 'BUD-01', year: 2026 }, note: 'doublon' },
    { method: 'PUT', path: `${B}/lignes/{{l2.data.id}}`, as: 'fin', body: { description: null, depense: 10, libelle: '' } },
    { method: 'PUT', path: `${B}/lignes/{{l1.data.id}}`, as: 'fin', body: { description: '', prevu: 2000000, code: 'bud-01b' } },
    { method: 'DELETE', path: `${B}/lignes/{{l2.data.id}}`, as: 'fin' },
    { method: 'DELETE', path: `${B}/lignes/{{l2.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${B}/lignes/{{l2.data.id}}`, as: 'super' },
    { method: 'POST', path: `${B}/demandes`, as: 'agent', body: { service: '', description: 'd', montant: 0 } },
    { method: 'POST', path: `${B}/demandes`, as: 'agent', save: 'd1', body: { service: ' Voirie ', description: ' Pavés ', montant: '150000' } },
    { method: 'POST', path: `${B}/demandes`, as: 'fin', save: 'd2', body: { service: 'Santé', description: 'Médicaments', montant: 75000.5, year: 2026 } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'agent', body: { montant: 1 } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'fin', body: { statut: 'APPROUVE' } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'fin', body: { montant: 160000, motif: ' Révisé ', service: 'Voirie urbaine' } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'super', body: { statut: 'APPROUVE', motif: 'OK' } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'super', body: { montant: 170000 } },
    { method: 'PUT', path: `${B}/demandes/{{d1.data.id}}`, as: 'super', body: { montant: 160000, motif: '' } },
    { method: 'PUT', path: `${B}/demandes/{{d2.data.id}}`, as: 'super', body: { statut: 'REJETE', motif: 'Budget épuisé' } },
    { method: 'PUT', path: `${B}/demandes/{{d2.data.id}}`, as: 'super', body: { statut: 'EN_ATTENTE' } },
    { method: 'PUT', path: `${B}/demandes/{{d2.data.id}}`, as: 'super', body: { statut: 'AUTRE' } },
    { method: 'PUT', path: `${B}/demandes/{{d2.data.id}}`, body: { statut: 'APPROUVE' }, note: 'admin lecture seule' },
    { method: 'PUT', path: `${B}/demandes/00000000-0000-4000-8000-000000000000`, as: 'super', body: {} },
    { path: `${B}/demandes` },
    { path: `${B}/lignes` },
    { path: `${B}/stats` },
    { path: '/api/v1/dashboard/statistiques' },
  ],
};
