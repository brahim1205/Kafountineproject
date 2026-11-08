import { C, C2 } from '../ids.mjs';
import { execFileSync } from 'node:child_process';
const row = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-qAt', '-F', '|', '-d', 'kaf_seeded', '-c', sql], { encoding: 'utf8' }).trim().split('|');
const [nin, tel] = row(`SELECT nin, telephone FROM "Contribuable" WHERE id = '${C}'`);
const [pending] = row(`SELECT id FROM "Transaction" WHERE "contribuableId" = '${C}' AND statut <> 'PAYE' ORDER BY numero LIMIT 1`);
const [paid] = row(`SELECT id FROM "Transaction" WHERE "contribuableId" = '${C}' AND statut = 'PAYE' ORDER BY numero LIMIT 1`);
const [other] = row(`SELECT id FROM "Transaction" WHERE "contribuableId" = '${C2}' ORDER BY numero LIMIT 1`);
const P = '/api/v1/portal';
const Z = '00000000-0000-4000-8000-000000000000';
export default {
  async setup(login) { await login('agent', 'agent@kafountine.gouv.sn', 'TestPassword123!'); },
  steps: [
    { path: `${P}/auth/me`, as: null },
    { path: `${P}/auth/me`, as: 'agent', note: 'jeton agent refusé' },
    { method: 'POST', path: `${P}/auth/request-otp`, as: null, body: {} },
    { method: 'POST', path: `${P}/auth/request-otp`, as: null, body: { nin, telephone: '000' } },
    { method: 'POST', path: `${P}/auth/contribuable`, as: null, save: 'o0', body: { nin, telephone: ` ${tel} ` } },
    { method: 'POST', path: `${P}/auth/request-otp`, as: null, save: 'o1', body: { nin, telephone: tel } },
    { method: 'POST', path: `${P}/auth/verify-otp`, as: null, body: { requestId: 'x', code: '12' } },
    { method: 'POST', path: `${P}/auth/verify-otp`, as: null, body: { requestId: Z, code: '123456' } },
    { method: 'POST', path: `${P}/auth/verify-otp`, as: null, body: { requestId: '{{o1.data.requestId}}', code: '000000x' } },
    { method: 'POST', path: `${P}/auth/verify-otp`, as: null, portalAs: 'c', body: { requestId: '{{o1.data.requestId}}', code: ' {{o1.data.devCode}} ' } },
    { method: 'POST', path: `${P}/auth/verify-otp`, as: null, note: 'code déjà utilisé', body: { requestId: '{{o1.data.requestId}}', code: '{{o1.data.devCode}}' } },
    { path: `${P}/auth/me`, as: 'c' },
    { path: `${P}/contribuable/${C}/taxes`, as: 'c' },
    { path: `${P}/contribuable/${C}/transactions`, as: 'c' },
    { path: `${P}/contribuable/${C2}/taxes`, as: 'c' },
    { path: `${P}/contribuable/${C2}/transactions`, as: 'c' },
    { path: `${P}/payment/availability`, as: 'c' },
    { path: `${P}/recu/${pending}`, as: 'c' },
    { path: `${P}/recu/${other}`, as: 'c' },
    { path: `${P}/recu/abc`, as: 'c' },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: {} },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: -1, taxes: 'x', bad: 1 } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1, taxes: [1, ''], contribuableId: 'x' } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1, taxes: Array(51).fill('a') } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1 } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1, taxes: [Z] } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1, taxes: [other] } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', body: { amount: 1, taxes: [paid] } },
    { method: 'POST', path: `${P}/payment/initiate`, as: 'c', save: 'pay', body: { montant: '1', taxes: [pending, paid], telephone: ' 77 ', categorie: 'TAXE' } },
    { method: 'POST', path: `${P}/payment/confirm`, as: 'c', body: {} },
    { method: 'POST', path: `${P}/payment/confirm`, as: 'c', body: { transactionId: 'PAY-0' } },
    { method: 'POST', path: `${P}/payment/confirm`, as: 'c', body: { transactionId: '{{pay.paymentId}}', reference: ' R1 ' } },
    { method: 'POST', path: `${P}/payment/confirm`, as: 'c', body: { transactionId: '{{pay.paymentId}}' }, note: 'déjà confirmé' },
    { path: `${P}/contribuable/${C}/taxes`, as: 'c' },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin: 'a', nom: '', prenom: 'B' } },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin, nom: 'A', prenom: 'B' } },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin: 'PORT-1', nom: 'A', prenom: 'B', telephone: tel } },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin: 'PORT-1', nom: ' Portail ', prenom: 'Ami', telephone: '+221700000321', dateNaiss: '1995-04-05', lieuNaiss: ' Abéné ' } },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin: 'PORT-2', nom: 'Sans', prenom: 'Tel', adresse: '', dateNaiss: '' } },
    { method: 'POST', path: `${P}/auth/register`, as: null, body: { nin: 'PORT-3', nom: 'Mauvaise', prenom: 'Date', telephone: '+221700000322', dateNaiss: 'zz' } },
    { method: 'POST', path: `${P}/auth/logout`, as: 'c' },
    { method: 'POST', path: `${P}/auth/logout`, as: null },
    { path: '/api/v1/contribuables?search=Portail', as: 'agent' },
  ],
};
