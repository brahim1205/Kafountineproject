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
    return prisma.contribuable.findUnique({ where: { id } });
  }

  async findByNin(nin: string) {
    return prisma.contribuable.findUnique({ where: { nin } });
  }

  async findByTelephone(telephone: string) {
    return prisma.contribuable.findFirst({ where: { telephone } });
  }

  async search(filters: ContribuableFilters) {
    return prisma.contribuable.findMany({
      where: this.buildWhere(filters.search),
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(filters: ContribuableFilters) {
    return prisma.contribuable.count({ where: this.buildWhere(filters.search) });
  }

  async create(payload: CreateContribuablePayload) {
    return prisma.contribuable.create({ data: payload });
  }

  async update(id: string, payload: UpdateContribuablePayload) {
    return prisma.contribuable.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string) {
    await prisma.contribuable.delete({ where: { id } });
  }

  private buildWhere(search?: string): Prisma.ContribuableWhereInput {
    if (!search?.trim()) {
      return {};
    }

    return {
      OR: [
        { nin: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
      ],
    };
  }
}
