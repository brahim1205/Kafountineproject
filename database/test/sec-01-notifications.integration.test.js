// SEC-01 : une notification adressée à un compte n'est ni visible ni modifiable par un autre.
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { describeIntegration, login } = require('./helpers/session');

const prisma = new PrismaClient();

describeIntegration('SEC-01 notifications privées', () => {
  const year = new Date().getFullYear();
  const id = randomUUID();
  let owner;
  let other;

  beforeAll(async () => {
    owner = await login('superadmin@kafountine.gouv.sn');
    other = await login('agent@kafountine.gouv.sn');
    await prisma.appNotification.create({
      data: { id, userId: owner.user.id, type: 'alerte', titre: 'Privée', message: 'Réservée au destinataire', year },
    });
  });

  afterAll(async () => {
    await prisma.appNotification.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  const ids = (res) => (res.body.data.notifications || res.body.data).map((n) => n.id);

  it('ne la montre qu’à son destinataire', async () => {
    expect(ids(await owner.get(`/notifications?year=${year}&limit=500`))).toContain(id);
    expect(ids(await other.get(`/notifications?year=${year}&limit=500`))).not.toContain(id);
  });

  it('refuse qu’un autre compte la marque comme lue', async () => {
    expect((await other.patch(`/notifications/${id}/read`).send({})).status).toBe(404);
    expect((await prisma.appNotification.findUnique({ where: { id } })).lu).toBe(false);
    expect((await owner.patch(`/notifications/${id}/read`).send({})).status).toBe(200);
  });

  it('ne marque pas ses notifications lorsque un autre compte lit tout', async () => {
    await prisma.appNotification.update({ where: { id }, data: { lu: false, readAt: null } });
    await other.patch('/notifications/read-all').send({});
    expect((await prisma.appNotification.findUnique({ where: { id } })).lu).toBe(false);
  });
});
