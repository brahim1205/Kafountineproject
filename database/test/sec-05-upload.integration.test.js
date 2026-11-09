// SEC-05 : un fichier trop volumineux est refusé clairement, sans erreur interne.
const { describeIntegration, login } = require('./helpers/session');

describeIntegration('SEC-05 taille des images', () => {
  it('répond 413 au-delà de la limite', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const content = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await agent.post('/upload/image').attach('image', content, { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
  });
});
