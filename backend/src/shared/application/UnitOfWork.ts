/** Exécute un traitement de façon atomique : toutes ses écritures (audit compris) sont validées ensemble ou annulées. */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

type AsyncMethodKeys<T> = { [K in keyof T]: T[K] extends (...args: never[]) => Promise<unknown> ? K : never }[keyof T];

/**
 * Fait passer les méthodes listées d'un service par l'unité de travail.
 * Les services restent écrits sans transaction ; la frontière transactionnelle est déclarée au câblage.
 */
export function transactional<T extends object>(service: T, unitOfWork: UnitOfWork, methods: Array<AsyncMethodKeys<T>>): T {
  for (const name of methods) {
    const original = service[name] as unknown as (...args: unknown[]) => Promise<unknown>;
    Object.defineProperty(service, name, {
      value: (...args: unknown[]) => unitOfWork.run(() => original.apply(service, args)),
    });
  }
  return service;
}
