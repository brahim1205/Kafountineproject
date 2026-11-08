import { C, C2 } from '../ids.mjs';
const P = 'TestPassword123!';
const E = '/api/v1/etat-civil';
const U = '/api/v1/urbanisme';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('finances', 'finances@kafountine.gouv.sn', P);
    await login('etatcivil', 'etatcivil@kafountine.gouv.sn', P);
  },
  steps: [
    { path: E },
    { path: `${E}?year=2025&limit=10` },
    { path: `${E}?limit=501` },
    { path: `${E}/types-documents` },
    { path: `${E}/statistiques` },
    { path: `${E}/statistiques?year=2025` },
    { method: 'POST', path: E, as: 'agent', body: {} },
    { method: 'POST', path: E, as: 'agent', body: { contribuableId: C, typeDocument: 'x', exemplaires: 0, montant: -1, statut: 'NOPE', year: 1990 } },
    { method: 'POST', path: E, as: 'finances', body: { contribuableId: C, typeDocument: 'x', exemplaires: 1, montant: 1 } },
    { method: 'POST', path: E, as: 'etatcivil', body: { contribuableId: C, typeDocument: 'Extrait de naissance', exemplaires: 1, montant: 500 } },
    { method: 'POST', path: E, as: 'agent', body: { contribuableId: '00000000-0000-4000-8000-000000000000', typeDocument: 'x', exemplaires: 1, montant: 1 } },
    { method: 'POST', path: E, as: 'agent', save: 'e1', body: { contribuableId: C, typeDocument: 'etat-civil-deces-extrait-de-deces', exemplaires: 2, montant: 1000, observations: ' note ' } },
    { method: 'POST', path: E, as: 'agent', save: 'e2', body: { contribuableId: C, typeDocument: 'Extrait de naissance', exemplaires: '3', montant: '0', statut: 'VALIDE', year: 2025 } },
    { method: 'POST', path: E, as: 'super', save: 'e3', body: { contribuableId: C, typeDocument: 'Mariage - Livret de famille', exemplaires: 1, montant: 750.5, statut: 'REJETE', observations: '' } },
    { method: 'PUT', path: `${E}/{{e1.data.id}}`, as: 'agent', body: { statut: 'rejete', observations: '' } },
    { method: 'PUT', path: `${E}/{{e1.data.id}}`, as: 'agent', body: { contribuableId: C2, typeDocument: 'certificat de residence', exemplaires: 4, montant: 12 } },
    { method: 'PUT', path: `${E}/{{e2.data.id}}`, as: 'agent', body: { contribuableId: '00000000-0000-4000-8000-000000000000' } },
    { method: 'PUT', path: `${E}/{{e2.data.id}}`, as: 'agent', body: {} },
    { method: 'PUT', path: `${E}/00000000-0000-4000-8000-000000000000`, as: 'agent', body: {} },
    { method: 'PUT', path: `${E}/x`, as: 'agent', body: {} },
    { method: 'DELETE', path: `${E}/{{e3.data.id}}`, as: 'agent' },
    { method: 'DELETE', path: `${E}/{{e3.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${E}/{{e3.data.id}}`, as: 'super' },
    { path: E },
    { path: `${E}/statistiques` },
    // Urbanisme
    { path: U },
    { path: `${U}?page=2&limit=3&statut=valide` },
    { path: `${U}?type=x` },
    { path: `${U}?limit=301` },
    { path: `${U}/statistiques` },
    { path: `${U}/00000000-0000-4000-8000-000000000000` },
    { path: `${U}/abc` },
    { method: 'POST', path: U, as: 'agent', body: { contribuableId: C } },
    { method: 'POST', path: U, as: 'agent', body: { contribuableId: C, type: 'permis-construire', surface: -5 } },
    { method: 'POST', path: U, as: 'agent', save: 'u1', body: { contribuableId: C, type: 'Permis de construire', surface: 120, description: ' Villa ', localisation: 'Abéné', nature: '' } },
    { method: 'POST', path: U, as: 'agent', save: 'u2', body: { contribuableId: C, type: 'permis-construire', surface: 0.5 } },
    { method: 'POST', path: U, as: 'super', save: 'u3', body: { contribuableId: C, type: 'Bornage', montant: '0', statut: 'REJETE', year: 2026 } },
    { method: 'POST', path: U, as: 'super', save: 'u4', body: { contribuableId: C, type: 'titre foncier' } },
    { path: `${U}/{{u1.data.id}}` },
    { method: 'PUT', path: `${U}/{{u1.data.id}}`, as: 'agent', body: { statut: 'rejete', description: '', surface: 10 } },
    { method: 'PUT', path: `${U}/{{u2.data.id}}`, as: 'agent', body: { type: 'certificat de conformité', montant: 99, localisation: ' Ici ', nature: 'mixte' } },
    { method: 'PUT', path: `${U}/{{u2.data.id}}`, as: 'agent', body: { contribuableId: C } },
    { method: 'DELETE', path: `${U}/{{u4.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${U}/{{u4.data.id}}`, as: 'super' },
    { path: `${U}?limit=5` },
    { path: `${U}/statistiques` },
    { path: '/api/v1/dashboard/statistiques' },
  ],
};
