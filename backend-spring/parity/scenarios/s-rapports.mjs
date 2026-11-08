const P = 'TestPassword123!';
const E = '/api/v1/exports';
const receipt = { ticketNumber: 'TX-2026-001', date: '08/11/2026', time: '10:30', contributor: 'Awa Diatta', type: 'État civil', amount: 1234567.5 };
const report = { year: 2026, total: 9876543.21, tauxRecouvrement: 87.5, totalTransactions: 1500, totalContribuables: 21,
  modules: [{ name: 'Recettes', amount: 5000000, evolution: 12.5 }, { name: 'Marché', amount: 0 }], topContribuables: [{ name: 'Sène Ali', amount: 250000.75 }] };
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('quai', 'quaipeche@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${E}/report-data` },
    { path: `${E}/report-data?year=2025` },
    { path: `${E}/report-data?year=abc` },
    { path: `${E}/report-data`, as: 'agent' },
    { method: 'POST', path: `${E}/receipt.pdf`, as: 'agent', body: {} },
    { method: 'POST', path: `${E}/receipt.pdf`, as: 'agent', raw: true, headers: ['content-type', 'content-disposition'], body: receipt },
    { method: 'POST', path: `${E}/receipt.pdf`, as: 'quai', raw: true, body: { ...receipt, ticketNumber: 'Reçu n° 7/ß', amount: '0.0005', agent: ' Fatou ', nin: '', description: 'x'.repeat(300) } },
    { method: 'POST', path: `${E}/receipt.pdf`, raw: true, note: 'admin autorisé', body: { ...receipt, amount: 1000, telephone: '77 000 00 00', service: 'Œuvre & Cie' } },
    { method: 'POST', path: `${E}/report.pdf`, body: { year: 'x' } },
    { method: 'POST', path: `${E}/report.pdf`, body: { ...report, modules: [1, { name: '', amount: -1, x: 2 }, { name: 'A', amount: 5, evolution: 'z' }] } },
    { method: 'POST', path: `${E}/report.pdf`, body: { ...report, modules: Array.from({ length: 51 }, () => ({ name: 'A', amount: 1, bad: 1 })), extra: 1 } },
    { method: 'POST', path: `${E}/report.pdf`, raw: true, headers: ['content-type', 'content-disposition'], body: report },
    { method: 'POST', path: `${E}/report.pdf`, raw: true, body: { ...report, year: 2025, modules: [], topContribuables: [] } },
    { method: 'POST', path: `${E}/report.pdf`, as: 'agent', body: report },
    { path: '/api/v1/audit?limit=5' },
  ],
};
