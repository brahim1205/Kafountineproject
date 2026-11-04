import bcrypt from 'bcryptjs';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/AppError';
import { fakeAuditTrail } from '../../../shared/testing/ports';
import type { AuthUser } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';
import { ChangePasswordUseCase } from './ChangePasswordUseCase';

describe('ChangePasswordUseCase', () => {
  const current = 'AncienMotDePasse1!';
  const next = 'NouveauMotDePasse2!';
  let repository: jest.Mocked<UserRepository>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let useCase: ChangePasswordUseCase;
  const input = (overrides = {}) => ({ userId: 'user-1', role: 'AGENT', ipAddress: null, currentPassword: current, newPassword: next, ...overrides });

  beforeEach(async () => {
    const user = { id: 'user-1', email: 'agent@kafountine.gouv.sn', password: await bcrypt.hash(current, 4), isActive: true } as AuthUser;
    repository = { findByEmail: jest.fn(), findById: jest.fn().mockResolvedValue(user), updatePassword: jest.fn() };
    auditTrail = fakeAuditTrail();
    useCase = new ChangePasswordUseCase(repository, auditTrail);
  });

  it('enregistre le nouveau mot de passe haché et trace le changement', async () => {
    await useCase.execute(input());

    const hash = repository.updatePassword.mock.calls[0][1];
    expect(await bcrypt.compare(next, hash)).toBe(true);
    expect(auditTrail.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }), expect.objectContaining({ action: 'Changement de mot de passe' }));
  });

  it('refuse un mot de passe actuel incorrect', async () => {
    await expect(useCase.execute(input({ currentPassword: 'Faux123456789!' }))).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });

  it('refuse un mot de passe faible ou inchangé', async () => {
    await expect(useCase.execute(input({ newPassword: 'court' }))).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(input({ newPassword: current }))).rejects.toBeInstanceOf(ValidationError);
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });
});
