import type { ContribuableRepository } from '../domain/ContribuableRepository';

export class CheckTelephoneUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(telephone: string) {
    const contribuable = await this.contribuableRepository.findByTelephone(telephone);
    return {
      exists: Boolean(contribuable),
      contribuable,
    };
  }
}
