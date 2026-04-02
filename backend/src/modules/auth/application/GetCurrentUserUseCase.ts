import { NotFoundError } from '../../../shared/errors/AppError';
import type { UserRepository } from '../domain/UserRepository';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Utilisateur introuvable');
    }

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    };
  }
}
