import { ConflictError } from '../../../shared/errors/AppError';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { ContribuableRepository } from '../../contribuables/domain/ContribuableRepository';

export class RegisterPortalContribuableUseCase {
  constructor(
    private readonly contribuableRepository: ContribuableRepository,
    private readonly tokenService: JwtTokenService
  ) {}

  async execute(input: {
    nin: string;
    nom: string;
    prenom: string;
    telephone?: string;
    adresse?: string;
    lieuNaiss?: string;
    dateNaiss?: string;
  }) {
    const normalizedNin = input.nin.trim();
    const normalizedPhone = input.telephone?.trim();

    const existingNin = await this.contribuableRepository.findByNin(normalizedNin);
    if (existingNin) {
      throw new ConflictError('Ce numéro de carte d\'identité (NIN) est déjà utilisé par un autre contribuable');
    }

    if (normalizedPhone) {
      const existingPhone = await this.contribuableRepository.findByTelephone(normalizedPhone);
      if (existingPhone) {
        throw new ConflictError('Ce numéro de téléphone est déjà utilisé par un autre contribuable');
      }
    }

    const contribuable = await this.contribuableRepository.create({
      nin: normalizedNin,
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      dateNaiss: input.dateNaiss ? new Date(input.dateNaiss) : new Date('1990-01-01T00:00:00.000Z'),
      lieuNaiss: input.lieuNaiss?.trim() || 'Kafountine',
      adresse: input.adresse?.trim() || 'Non renseignée',
      telephone: normalizedPhone || '',
      email: null,
      profession: null,
      typeContribuable: 'PARTICULIER',
      zone: null,
      montantImpot: 0,
      isActive: true,
    });

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
