import { NotFoundError } from '../../../shared/errors/AppError';
import type { ContribuableRepository } from '../../contribuables/domain/ContribuableRepository';

export class GetPortalProfileUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(contribuableId: string) {
    const contribuable = await this.contribuableRepository.findById(contribuableId);
    if (!contribuable) {
      throw new NotFoundError('Contribuable introuvable');
    }

    return {
      id: contribuable.id,
      nom: contribuable.nom,
      prenom: contribuable.prenom,
      nin: contribuable.nin,
      telephone: contribuable.telephone,
      email: contribuable.email,
    };
  }
}
