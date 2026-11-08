const P = 'TestPassword123!';
const D = '/api/v1/dashboard';
export default {
  async setup(login) {
    await login('admin', 'admin@kafountine.gouv.sn', P);
    await login('agent', 'agent@kafountine.gouv.sn', P);
    await login('quai', 'quaipeche@kafountine.gouv.sn', P);
  },
  steps: [
    { path: `${D}/statistiques` },
    { path: `${D}/statistiques?year=2025` },
    { path: `${D}/statistiques`, as: 'agent' },
    { path: `${D}/statistiques`, as: 'quai' },
    { path: `${D}/statistiques?year=1999&limit=0` },
    { path: `${D}/top-contribuables` },
    { path: `${D}/top-contribuables?limit=3` },
    { path: `${D}/top-contribuables?year=2025&limit=100` },
    { path: `${D}/top-contribuables?limit=101` },
  ],
};
