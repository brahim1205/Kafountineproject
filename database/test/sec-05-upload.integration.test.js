// SEC-05 : un fichier trop volumineux est refusé clairement, sans erreur interne.
const { describeIntegration, login, anonymous } = require('./helpers/session');

describeIntegration('SEC-05 taille des images', () => {
  it('répond 413 au-delà de la limite', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const content = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await agent.post('/upload/image').attach('image', content, { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
  });

  it('ne sert les photos qu\'aux comptes connectés', async () => {
    const agent = await login('agent@kafountine.gouv.sn');
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const sent = await agent.post('/upload/image').attach('image', jpeg, { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(sent.status).toBe(201);
    const url = sent.body.data.url;
    expect((await anonymous().get(url)).status).toBe(401);
    expect((await agent.session.get(url)).status).toBe(200);
    await agent.delete(`/upload/image/${sent.body.data.publicId}`);
  });
});
