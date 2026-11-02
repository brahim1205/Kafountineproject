import { UnauthorizedError } from '../../../shared/errors/AppError';
import type { ContribuableRepository } from '../../contribuables/domain/ContribuableRepository';
import { PortalOtpService } from './PortalOtpService';

export class RequestPortalOtpUseCase {
  constructor(
    private readonly contribuableRepository: ContribuableRepository,
    private readonly otpService: PortalOtpService
  ) {}

  async execute(input: { nin?: string; telephone?: string }) {
    const normalizedNin = input.nin?.trim();
    const normalizedTelephone = input.telephone?.trim();
    const contribuable = normalizedNin
      ? await this.contribuableRepository.findByNin(normalizedNin)
      : null;

    if (!contribuable || contribuable.telephone.trim() !== normalizedTelephone) {
      throw new UnauthorizedError('Identifiants invalides');
    }

    const challenge = await this.otpService.createChallenge(contribuable.id, contribuable.telephone);
    return {
      ...challenge,
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
