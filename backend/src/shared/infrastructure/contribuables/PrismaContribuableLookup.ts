import { db } from '../prisma/transactionContext';
import type { ContribuableLookup } from '../../domain/ContribuableLookup';

export class PrismaContribuableLookup implements ContribuableLookup {
  findById(id: string) {
    return db().contribuable.findUnique({
      where: { id },
      select: { id: true, nom: true, prenom: true, nin: true, telephone: true, adresse: true },
    });
  }
}
