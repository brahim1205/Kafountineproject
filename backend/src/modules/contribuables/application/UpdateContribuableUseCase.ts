import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import type { ContribuableRepository, UpdateContribuablePayload } from '../domain/ContribuableRepository';

export class UpdateContribuableUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(
    id: string,
    input: {
      nin?: string;
      telephone?: string;
      dateNaiss?: string;
      [key: string]: unknown;
    }
  ) {
    const existing = await this.contribuableRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Contribuable introuvable');
    }

    if (input.nin && input.nin !== existing.nin) {
      const ninOwner = await this.contribuableRepository.findByNin(String(input.nin));
      if (ninOwner) {
        throw new ConflictError('Ce numéro de carte d\'identité (NIN) est déjà utilisé par un autre contribuable');
      }
    }

    if (input.telephone && input.telephone !== existing.telephone) {
      const phoneOwner = await this.contribuableRepository.findByTelephone(String(input.telephone));
      if (phoneOwner) {
        throw new ConflictError('Ce numéro de téléphone est déjà utilisé par un autre contribuable');
      }
    }

    const payload: UpdateContribuablePayload = {};

    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || key === 'dateNaiss') {
        continue;
      }

      payload[key as keyof UpdateContribuablePayload] = value as never;
    }

    if (input.dateNaiss) {
      payload.dateNaiss = new Date(String(input.dateNaiss));
    }

    return this.contribuableRepository.update(id, payload);
  }
}
