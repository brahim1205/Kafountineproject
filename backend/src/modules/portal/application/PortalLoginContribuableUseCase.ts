import { NotFoundError } from '../../../shared/errors/AppError';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { ContribuableRepository } from '../../contribuables/domain/ContribuableRepository';

export class PortalLoginContribuableUseCase {
  constructor(
    private readonly contribuableRepository: ContribuableRepository,
    private readonly tokenService: JwtTokenService
  ) {}

  async execute(input: { nin?: string; telephone?: string }) {
    const contribuable = input.nin
      ? await this.contribuableRepository.findByNin(input.nin)
      : input.telephone
        ? await this.contribuableRepository.findByTelephone(input.telephone)
        : null;

    if (!contribuable) {
      throw new NotFoundError('Contribuable non trouvé');
    }

    return {
      token: this.tokenService.signPortalToken({
        id: contribuable.id,
        role: 'CONTRIBUABLE',
      }),
      contribuable: {
        id: contribuable.id,
        nom: contribuable.nom,
        prenom: contribuable.prenom,
        nin: contribuable.nin,
        telephone: contribuable.telephone,
      },
    };
  }
}
