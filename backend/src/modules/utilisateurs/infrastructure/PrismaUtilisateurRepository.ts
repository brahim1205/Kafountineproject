import bcrypt from 'bcryptjs';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type { PasswordHasher, UtilisateurRepository, UtilisateurValues } from '../domain/Utilisateur';

export class PrismaUtilisateurRepository implements UtilisateurRepository {
  search(search: string) {
    return prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { telephone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ role: 'asc' }, { nom: 'asc' }, { prenom: 'asc' }],
    });
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async countTransactions(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    return user ? user._count.transactions : null;
  }

  create(values: UtilisateurValues & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: values.email,
        nom: values.nom,
        prenom: values.prenom,
        role: values.role,
        telephone: values.telephone,
        password: values.passwordHash,
      },
    });
  }

  update(id: string, values: UtilisateurValues) {
    const { passwordHash, ...data } = values;
    return prisma.user.update({
      where: { id },
      data: passwordHash ? { ...data, password: passwordHash } : data,
    });
  }

  async deactivate(id: string) {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  async delete(id: string) {
    await prisma.user.delete({ where: { id } });
  }
}

export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string) {
    return bcrypt.hash(password, 10);
  }
}
