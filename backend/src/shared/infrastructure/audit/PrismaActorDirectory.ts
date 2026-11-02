import { db } from '../prisma/transactionContext';
import type { ActorDirectory } from '../../audit/AuditTrail';

export class PrismaActorDirectory implements ActorDirectory {
  async displayName(userId: string | null) {
    if (!userId) {
      return 'Agent municipal';
    }
    const user = await db().user.findUnique({ where: { id: userId } });
    return user ? `${user.prenom} ${user.nom}`.trim() : 'Agent municipal';
  }
}
