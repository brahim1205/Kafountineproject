import type { ContribuableRepository } from '../domain/ContribuableRepository';

export class ListContribuablesUseCase {
  constructor(private readonly contribuableRepository: ContribuableRepository) {}

  async execute(input: { search?: string; page: number; limit: number }) {
    const [data, total] = await Promise.all([
      this.contribuableRepository.search(input),
      this.contribuableRepository.count(input),
    ]);

    return {
      data,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
      },
    };
  }
}
