import { NotFoundError } from '../../../shared/errors/AppError';
import type { ContribuableRepository } from '../domain/ContribuableRepository';

export class DeleteContribuableUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(id: string) {
    const existing = await this.contribuableRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Contribuable introuvable');
    }

    await this.contribuableRepository.delete(id);
  }
}
