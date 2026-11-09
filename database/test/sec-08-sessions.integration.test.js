// SEC-08 : un accès retiré prend effet immédiatement, sans attendre l'expiration des jetons.
const { describeIntegration, login, origin, anonymous } = require('./helpers/session');
const request = require('supertest');
const { API_BASE_URL } = require('./helpers/session');

describeIntegration('SEC-08 révocation des sessions', () => {
  const suffix = Date.now().toString(36);
  const first = `Sess-${suffix}-Aa1!x`;
  const second = `Sess-${suffix}-Bb2!y`;
  let admin;

  async function account(tag) {
    const email = `sec08-${tag}-${suffix}@kafountine.gouv.sn`;
    const created = await admin.post('/users').send({ email, nom: 'Sec', prenom: 'Huit', role: 'AGENT', password: first });
    expect(created.status).toBe(201);
    const session = request.agent(API_BASE_URL);
    expect((await session.post('/api/v1/auth/login').set('Origin', origin).send({ email, password: first })).status).toBe(200);
    return { email, id: created.body.data.id, session, me: () => session.get('/api/v1/auth/me').set('Origin', origin), refresh: () => session.post('/api/v1/auth/refresh').set('Origin', origin).send({}) };
  }

  beforeAll(async () => {
    admin = await login('superadmin@kafountine.gouv.sn');
  });

  it('coupe l’accès après la déconnexion', async () => {
    const user = await account('logout');
    const cookies = (await user.session.post('/api/v1/auth/refresh').set('Origin', origin).send({})).headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    await user.session.post('/api/v1/auth/logout').set('Origin', origin).send({});
    expect((await anonymous().get('/api/v1/auth/me').set('Cookie', cookies)).status).toBe(401);
  });

  it('coupe les autres sessions après un changement de mot de passe et garde la session courante', async () => {
    const user = await account('pwd');
    const other = request.agent(API_BASE_URL);
    expect((await other.post('/api/v1/auth/login').set('Origin', origin).send({ email: user.email, password: first })).status).toBe(200);
    const changed = await user.session.post('/api/v1/auth/change-password').set('Origin', origin).send({ currentPassword: first, newPassword: second });
    expect(changed.status).toBe(200);
    expect((await user.me()).status).toBe(200);
    expect((await other.get('/api/v1/auth/me').set('Origin', origin)).status).toBe(401);
    expect((await other.post('/api/v1/auth/refresh').set('Origin', origin).send({})).status).toBe(401);
  });

  it('coupe l’accès d’un compte désactivé ou dont le rôle change', async () => {
    const off = await account('off');
    expect((await admin.put(`/users/${off.id}`).send({ isActive: false })).status).toBe(200);
    expect((await off.me()).status).toBe(401);
    const moved = await account('role');
    expect((await admin.put(`/users/${moved.id}`).send({ role: 'QUAI_PECHE' })).status).toBe(200);
    expect((await moved.me()).status).toBe(401);
  });
});
