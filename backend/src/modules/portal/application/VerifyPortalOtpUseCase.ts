import { UnauthorizedError } from '../../../shared/errors/AppError';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { ContribuableRepository } from '../../contribuables/domain/ContribuableRepository';
import { PortalOtpService } from './PortalOtpService';

export class VerifyPortalOtpUseCase {
  constructor(
    private readonly contribuableRepository: ContribuableRepository,
    private readonly tokenService: JwtTokenService,
    private readonly otpService: PortalOtpService
  ) {}

  async execute(input: { requestId: string; code: string }) {
    const contribuableId = await this.otpService.verifyChallenge(input.requestId, input.code.trim());
    const contribuable = await this.contribuableRepository.findById(contribuableId);
    if (!contribuable) {
      throw new UnauthorizedError('Identifiants invalides');
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
