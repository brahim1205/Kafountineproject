import { transactional, type UnitOfWork } from './UnitOfWork';

class Compteur {
  valeur = 0;
  async incrementer(pas: number) {
    this.valeur += pas;
    return this.valeur;
  }
  async lire() {
    return this.valeur;
  }
}

describe('transactional', () => {
  const run = jest.fn((work: () => Promise<unknown>) => work());
  const unitOfWork = { run } as unknown as UnitOfWork;

  it('fait passer les seules méthodes listées par l’unité de travail, avec leurs arguments et leur `this`', async () => {
    const compteur = transactional(new Compteur(), unitOfWork, ['incrementer']);

    await expect(compteur.incrementer(3)).resolves.toBe(3);
    expect(run).toHaveBeenCalledTimes(1);

    await expect(compteur.lire()).resolves.toBe(3);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('propage l’échec de l’unité de travail', async () => {
    const failing: UnitOfWork = { run: () => Promise.reject(new Error('rollback')) };
    const compteur = transactional(new Compteur(), failing, ['incrementer']);

    await expect(compteur.incrementer(1)).rejects.toThrow('rollback');
  });
});
