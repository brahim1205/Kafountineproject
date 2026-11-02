import { prisma } from '../prisma/prismaClient';
import type { ContribuableLookup } from '../../domain/ContribuableLookup';

export class PrismaContribuableLookup implements ContribuableLookup {
  findById(id: string) {
    return prisma.contribuable.findUnique({
      where: { id },
      select: { id: true, nom: true, prenom: true, nin: true, telephone: true, adresse: true },
    });
  }
}
