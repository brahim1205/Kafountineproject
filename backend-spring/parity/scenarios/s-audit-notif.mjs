const P = 'TestPassword123!';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('super', 'superadmin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
  },
  steps: [
    { path: '/api/v1/audit' },
    { path: '/api/v1/audit?page=2&limit=2&statut=SUCCESS' },
    { path: '/api/v1/audit?search=compte%25&module=Utilisateurs' },
    { path: '/api/v1/audit?search=_&module=all&statut=all' },
    { path: '/api/v1/audit?limit=301&x=1' },
    { path: '/api/v1/audit', as: 'agent' },
    { method: 'POST', path: '/api/v1/audit/seed', note: 'admin lecture seule' },
    { method: 'POST', path: '/api/v1/audit/seed', as: 'super' },
    { method: 'POST', path: '/api/v1/audit/export', raw: true, headers: ['content-type', 'content-disposition'] },
    { method: 'POST', path: '/api/v1/audit/export', as: 'super', body: { year: 2025 }, raw: true, headers: ['content-disposition'] },
    { method: 'POST', path: '/api/v1/audit/export', as: 'super', body: { year: 'x', other: 1 } },
    { path: '/api/v1/audit?search=Initialisation' },
    { path: '/api/v1/notifications' },
    { path: '/api/v1/notifications?year=2025&limit=2&foo=bar' },
    { path: '/api/v1/notifications?year=2024' },
    { path: '/api/v1/notifications?limit=abc' },
    { path: '/api/v1/notifications?limit=' },
    { path: '/api/v1/notifications', as: 'agent', save: 'n' },
    { method: 'PATCH', path: '/api/v1/notifications/{{n.data.0.id}}/read', as: 'agent' },
    { method: 'PATCH', path: '/api/v1/notifications/{{n.data.1.id}}/read', note: 'admin autorisé' },
    { method: 'PATCH', path: '/api/v1/notifications/00000000-0000-4000-8000-000000000000/read' },
    { method: 'PATCH', path: '/api/v1/notifications/abc/read' },
    { method: 'PATCH', path: '/api/v1/notifications/read-all?year=2025' },
    { method: 'PATCH', path: '/api/v1/notifications/read-all?year=abc' },
    { path: '/api/v1/notifications?year=2025' },
    { path: '/api/v1/years' },
    { path: '/api/v1/years?year=1' },
    { path: '/api/v1/years/current' },
    { method: 'POST', path: '/api/v1/years/auto-create', note: 'admin lecture seule' },
    { method: 'POST', path: '/api/v1/years/auto-create', as: 'super' },
    { method: 'POST', path: '/api/v1/years/auto-create', as: 'agent' },
    { path: '/api/v1/audit?limit=3' },
  ],
};
