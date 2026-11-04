import bcrypt from 'bcryptjs';
import type { AuditTrail } from '../../../shared/audit/AuditTrail';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/AppError';
import { validateStrongPassword } from '../../../shared/security/passwordPolicy';
import type { UserRepository } from '../domain/UserRepository';

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async execute(input: { userId: string; role: string; ipAddress: string | null; currentPassword: string; newPassword: string }) {
    const user = await this.userRepository.findById(input.userId);
    if (!user || !user.isActive || !(await bcrypt.compare(input.currentPassword, user.password))) {
      throw new UnauthorizedError('Mot de passe actuel incorrect.');
    }
    if (input.newPassword === input.currentPassword) {
      throw new ValidationError("Le nouveau mot de passe doit être différent de l'actuel.");
    }
    validateStrongPassword(input.newPassword);

    await this.userRepository.updatePassword(user.id, await bcrypt.hash(input.newPassword, 10));
    await this.auditTrail.record(
      { userId: user.id, role: input.role, ipAddress: input.ipAddress },
      { action: 'Changement de mot de passe', module: 'Utilisateurs', details: `Mot de passe modifié par ${user.email}` }
    );
  }
}
