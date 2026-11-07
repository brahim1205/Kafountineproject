import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '@prisma/client';
import { prisma } from './prismaClient';
import type { UnitOfWork } from '../../application/UnitOfWork';

const currentTransaction = new AsyncLocalStorage<Prisma.TransactionClient>();

/**
 * Limites des transactions (Prisma : 2 s d'attente d'une connexion, 5 s d'exécution par défaut).
 * Aux heures d'affluence, les tickets d'une même série attendent le verrou de leur compteur :
 * des limites trop courtes feraient échouer des encaissements valides.
 */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

/** Client à utiliser par les dépôts : la transaction en cours s'il y en a une, sinon le client global. */
export function db(): Prisma.TransactionClient {
  return currentTransaction.getStore() ?? prisma;
}

/** Ouvre une transaction, ou rejoint celle en cours (Prisma n'imbrique pas les transactions interactives). */
export function inTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const current = currentTransaction.getStore();
  if (current) {
    return work(current);
  }
  return prisma.$transaction((tx) => currentTransaction.run(tx, () => work(tx)), TRANSACTION_OPTIONS);
}

export class PrismaUnitOfWork implements UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return inTransaction(() => work());
  }
}
