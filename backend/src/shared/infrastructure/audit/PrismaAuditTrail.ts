import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma/prismaClient';
import type { Actor, AuditEntry, AuditTrail } from '../../audit/AuditTrail';

export class PrismaAuditTrail implements AuditTrail {
  async record(actor: Actor, entry: AuditEntry) {
    const user = actor.userId ? await prisma.user.findUnique({ where: { id: actor.userId } }) : null;

    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("id", "userId", "userName", "role", "action", "module", "details", "status", "ipAddress", "year", "timestamp")
      VALUES (${randomUUID()}, ${user?.id || null}, ${user ? `${user.prenom} ${user.nom}`.trim() : 'Système'}, ${user?.role || actor.role || 'SYSTEME'}, ${entry.action}, ${entry.module}, ${entry.details}, ${entry.status || 'success'}, ${actor.ipAddress}, ${new Date().getFullYear()}, CURRENT_TIMESTAMP)
    `;
  }
}
