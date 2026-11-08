const P = 'TestPassword123!';
const Q = '/api/v1/quai-peche';
const Z = '00000000-0000-4000-8000-000000000000';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('quai', 'quaipeche@kafountine.gouv.sn', P);
    await login('fin', 'finances@kafountine.gouv.sn', P);
  },
  steps: [
    ...['pecheurs', 'embarcations', 'commissions', 'camions', 'expeditions'].flatMap((c) => [
      { path: `${Q}/${c}`, as: 'quai', save: c },
      { path: `${Q}/${c}?year=2025&limit=3` },
      { path: `${Q}/${c}/{{${c}.data.0.id}}`, as: 'agent' },
      { path: `${Q}/${c}/${Z}` },
      { path: `${Q}/${c}/abc` },
    ]),
    { path: `${Q}/inconnu` },
    { path: `${Q}/statistiques`, as: 'fin' },
    { path: `${Q}/statistiques`, as: 'agent' },
    { path: `${Q}/pecheurs`, as: 'fin' },
    // Pêcheurs
    { method: 'POST', path: `${Q}/pecheurs`, as: 'quai', body: {} },
    { method: 'POST', path: `${Q}/pecheurs`, as: 'agent', body: { nom: 'A', prenom: 'B' } },
    { method: 'POST', path: `${Q}/pecheurs`, as: 'quai', save: 'p1', body: { nom: ' Sène ', prenom: 'Ali', telephone: '77', nin: '', adresse: ' Quai ', statut: 'actif' } },
    { method: 'POST', path: `${Q}/pecheurs`, as: 'quai', save: 'p2', body: { nom: 'Diédhiou', prenom: 'Awa', statut: '', year: 2025 } },
    { method: 'PUT', path: `${Q}/pecheurs/{{p1.data.id}}`, as: 'quai', body: { telephone: '', statut: 'inactif', nom: '' } },
    { method: 'PUT', path: `${Q}/pecheurs/{{p1.data.id}}`, as: 'quai', body: { nom: 'X', bad: 1 } },
    { method: 'PUT', path: `${Q}/pecheurs/{{p1.data.id}}`, as: 'quai', body: { prenom: 'Aliou', statut: '' } },
    // Embarcations
    { method: 'POST', path: `${Q}/embarcations`, as: 'quai', body: { nom: 'N', immatriculation: 'i', type: 't', taille: -1, pecheurId: 'x' } },
    { method: 'POST', path: `${Q}/embarcations`, as: 'quai', save: 'b1', body: { nom: 'Pirogue', immatriculation: ' zig-01 ', type: 'Pirogue', taille: '12.5', moteur: '40 CV', pecheurId: '{{p1.data.id}}' } },
    { method: 'POST', path: `${Q}/embarcations`, as: 'quai', save: 'b2', body: { nom: 'Sans', immatriculation: 'ZIG-02', type: 'Filet', taille: 0 } },
    { method: 'POST', path: `${Q}/embarcations`, as: 'quai', body: { nom: 'Dup', immatriculation: 'ZIG-01', type: 'X' }, note: 'immatriculation unique' },
    { method: 'PUT', path: `${Q}/embarcations/{{b2.data.id}}`, as: 'quai', body: { pecheurId: '{{p2.data.id}}', moteur: '', statut: 'en_reparation' } },
    { method: 'PUT', path: `${Q}/embarcations/{{b2.data.id}}`, as: 'quai', body: { pecheurId: Z } },
    { method: 'PUT', path: `${Q}/embarcations/{{b1.data.id}}`, as: 'quai', body: { taille: 15, immatriculation: 'zig-01b' } },
    // Commissions
    { method: 'POST', path: `${Q}/commissions`, as: 'quai', body: { pecheurId: Z, poids: 10, typePoisson: 'Thiof' } },
    { method: 'POST', path: `${Q}/commissions`, as: 'quai', body: { pecheurId: '{{p1.data.id}}', poids: 0, typePoisson: '', temperatura: 'x' } },
    { method: 'POST', path: `${Q}/commissions`, as: 'quai', save: 'c1', body: { pecheurId: '{{p1.data.id}}', poids: '120.5', typePoisson: 'Thiof', temperatura: -2, observations: ' Frais ', statut: 'IGNORE' } },
    { method: 'POST', path: `${Q}/commissions`, as: 'quai', save: 'c2', body: { pecheurId: '{{p2.data.id}}', poids: 50, typePoisson: 'Sardinelle', temperatura: 0, year: 2026 } },
    { method: 'PUT', path: `${Q}/commissions/{{c1.data.id}}`, as: 'quai', body: { statut: 'validee', observations: '', temperatura: null } },
    { method: 'PUT', path: `${Q}/commissions/{{c2.data.id}}`, as: 'quai', body: { statut: '', poids: 60, typePoisson: '' } },
    { method: 'PUT', path: `${Q}/commissions/{{c2.data.id}}`, as: 'quai', body: { year: 2025 } },
    // Camions et expéditions
    { method: 'POST', path: `${Q}/camions`, as: 'quai', body: { immatriculation: '', marque: '' } },
    { method: 'POST', path: `${Q}/camions`, as: 'quai', save: 't1', body: { immatriculation: 'dk-77', marque: 'Isuzu', modele: 'N', capacite: 8.5, chauffeur: ' Modou ', telephone: '' } },
    { method: 'POST', path: `${Q}/expeditions`, as: 'quai', body: { camionId: Z, poids: 1 } },
    { method: 'POST', path: `${Q}/expeditions`, as: 'quai', save: 'e1', body: { camionId: '{{t1.data.id}}', poids: 500, destination: ' Dakar ', montant: '75000.25', observations: 'ok' } },
    { method: 'POST', path: `${Q}/expeditions`, as: 'quai', save: 'e2', body: { camionId: '{{t1.data.id}}', poids: 10, statut: 'livree' } },
    { method: 'PUT', path: `${Q}/expeditions/{{e1.data.id}}`, as: 'quai', body: { statut: 'en_route', destination: '', montant: 0 } },
    { method: 'PUT', path: `${Q}/expeditions/{{e2.data.id}}`, as: 'quai', body: { camionId: '{{t1.data.id}}' } },
    { method: 'PUT', path: `${Q}/camions/{{t1.data.id}}`, as: 'quai', body: { capacite: 10, modele: '', statut: 'maintenance' } },
    { path: `${Q}/camions/{{t1.data.id}}` },
    { path: `${Q}/pecheurs/{{p1.data.id}}` },
    // Suppressions
    { method: 'DELETE', path: `${Q}/expeditions/{{e2.data.id}}`, as: 'quai' },
    { method: 'DELETE', path: `${Q}/expeditions/{{e2.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${Q}/expeditions/{{e2.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${Q}/pecheurs/{{p2.data.id}}`, as: 'super' },
    { method: 'DELETE', path: `${Q}/camions/${Z}`, as: 'super' },
    ...['pecheurs', 'embarcations', 'commissions', 'camions', 'expeditions'].map((c) => ({ path: `${Q}/${c}` })),
    { path: `${Q}/statistiques` },
    { path: '/api/v1/dashboard/statistiques' },
  ],
};
