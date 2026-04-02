import { ConflictError } from '../../../shared/errors/AppError';
import type { ContribuableRepository } from '../domain/ContribuableRepository';

export class CreateContribuableUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(input: {
    nin: string;
    nom: string;
    prenom: string;
    dateNaiss: string;
    lieuNaiss: string;
    adresse: string;
    telephone: string;
    email?: string;
    profession?: string;
    typeContribuable?: string;
    zone?: string;
    montantImpot?: number;
    isActive?: boolean;
  }) {
    const existingNin = await this.contribuableRepository.findByNin(input.nin);
    if (existingNin) {
      throw new ConflictError('Ce numéro de carte d\'identité (NIN) est déjà utilisé par un autre contribuable');
    }

    const existingPhone = await this.contribuableRepository.findByTelephone(input.telephone);
    if (existingPhone) {
      throw new ConflictError('Ce numéro de téléphone est déjà utilisé par un autre contribuable');
    }

    return this.contribuableRepository.create({
      ...input,
      dateNaiss: new Date(input.dateNaiss),
      email: input.email || null,
      profession: input.profession || null,
      typeContribuable: input.typeContribuable || 'PARTICULIER',
      zone: input.zone || null,
      montantImpot: Number(input.montantImpot || 0),
      isActive: input.isActive !== false,
    });
  }
}
