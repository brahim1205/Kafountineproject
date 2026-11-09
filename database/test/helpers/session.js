const request = require('supertest');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const origin = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
const password = process.env.SEED_DEFAULT_PASSWORD;
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/** Ouvre une session réelle sur l'API et renvoie des appels déjà authentifiés. */
async function login(email) {
  const session = request.agent(API_BASE_URL);
  const res = await session.post('/api/v1/auth/login').set('Origin', origin).send({ email, password });
  expect(res.status).toBe(200);
  const call = (method) => (path) => session[method](`/api/v1${path}`).set('Origin', origin);
  return { get: call('get'), post: call('post'), put: call('put'), patch: call('patch'), delete: call('delete'), user: res.body.data.user };
}

/** Requête sans cookie de session. */
const anonymous = () => request(API_BASE_URL);

module.exports = { API_BASE_URL, origin, password, describeIntegration, login, anonymous };
