import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { AuthUser } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<AuthUser | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<AuthUser | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}
