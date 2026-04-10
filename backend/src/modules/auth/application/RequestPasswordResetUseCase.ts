import { randomUUID } from 'node:crypto';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { UserRepository } from '../domain/UserRepository';

export class RequestPasswordResetUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return 'Si un compte existe avec cet email, une demande a été transmise à l’administrateur.';
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (user) {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
        },
        select: { id: true, prenom: true, nom: true },
      });

      const now = new Date();
      for (const admin of admins) {
        await prisma.$executeRaw`
          INSERT INTO "AppNotification" ("id","userId","type","titre","message","montant","contribuable","agent","lu","readAt","year","createdAt","updatedAt")
          VALUES (${randomUUID()}, ${admin.id}, ${'alerte'}, ${'Réinitialisation mot de passe'}, ${`Demande de réinitialisation reçue pour ${normalizedEmail}. Un administrateur doit définir un nouveau mot de passe.`}, ${null}, ${null}, ${`${user.prenom} ${user.nom}`.trim()}, ${false}, ${null}, ${now.getFullYear()}, ${now}, ${now})
        `;
      }
    }

    return 'Si un compte existe avec cet email, une demande a été transmise à l’administrateur.';
  }
}
