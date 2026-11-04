import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/infrastructure/prisma/prismaClient';
import type {
  ContribuableFilters,
  ContribuableRepository,
  CreateContribuablePayload,
  UpdateContribuablePayload,
} from '../domain/ContribuableRepository';

export class PrismaContribuableRepository implements ContribuableRepository {
  async findById(id: string) {
    const contribuable = await prisma.contribuable.findUnique({ where: { id } });
    return contribuable ? this.mapContribuable(contribuable) : null;
  }

  async findByNin(nin: string) {
    const contribuable = await prisma.contribuable.findUnique({ where: { nin } });
    return contribuable ? this.mapContribuable(contribuable) : null;
  }

  async findByTelephone(telephone: string) {
    const contribuable = await prisma.contribuable.findFirst({ where: { telephone } });
    return contribuable ? this.mapContribuable(contribuable) : null;
  }

  async search(filters: ContribuableFilters) {
    const contribuables = await prisma.contribuable.findMany({
      where: this.buildWhere(filters),
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
    return contribuables.map((contribuable) => this.mapContribuable(contribuable));
  }

  async count(filters: ContribuableFilters) {
    return prisma.contribuable.count({ where: this.buildWhere(filters) });
  }

  async create(payload: CreateContribuablePayload) {
    const contribuable = await prisma.contribuable.create({ data: payload });
    return this.mapContribuable(contribuable);
  }

  async update(id: string, payload: UpdateContribuablePayload) {
    const contribuable = await prisma.contribuable.update({
      where: { id },
      data: payload,
    });
    return this.mapContribuable(contribuable);
  }

  async delete(id: string) {
    await prisma.contribuable.delete({ where: { id } });
  }

  /** Chaque mot saisi doit apparaître dans le NIN, le nom, le prénom ou le téléphone (« Awa Diatta » trouve Awa Diatta). */
  private buildWhere({ search, isActive }: Pick<ContribuableFilters, 'search' | 'isActive'>): Prisma.ContribuableWhereInput {
    const words = (search || '').trim().split(/\s+/).filter(Boolean);
    return {
      ...(isActive === undefined ? {} : { isActive }),
      AND: words.map((word) => ({
        OR: [
          { nin: { contains: word, mode: 'insensitive' } },
          { nom: { contains: word, mode: 'insensitive' } },
          { prenom: { contains: word, mode: 'insensitive' } },
          { telephone: { contains: word, mode: 'insensitive' } },
        ],
      })),
    };
  }

  private mapContribuable(contribuable: Prisma.ContribuableGetPayload<object>) {
    return {
      ...contribuable,
      montantImpot: Number(contribuable.montantImpot),
    };
  }
}
