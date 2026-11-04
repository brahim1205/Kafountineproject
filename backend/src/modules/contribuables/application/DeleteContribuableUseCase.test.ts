import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import { admin, fakeAuditTrail } from '../../../shared/testing/ports';
import type { ContribuableRepository } from '../domain/ContribuableRepository';
import { DeleteContribuableUseCase } from './DeleteContribuableUseCase';

describe('DeleteContribuableUseCase', () => {
  const none = { tickets: 0, etatCivil: 0, urbanisme: 0, motos: 0 };
  let repository: jest.Mocked<Pick<ContribuableRepository, 'findById' | 'countLinkedRecords' | 'delete'>>;
  let auditTrail: ReturnType<typeof fakeAuditTrail>;
  let useCase: DeleteContribuableUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue({ id: 'c-1', nom: 'Diatta', prenom: 'Awa', nin: '1988000000999' }),
      countLinkedRecords: jest.fn().mockResolvedValue(none),
      delete: jest.fn(),
    };
    auditTrail = fakeAuditTrail();
    useCase = new DeleteContribuableUseCase(repository as unknown as ContribuableRepository, auditTrail);
  });

  it('supprime une fiche sans pièce rattachée et le trace', async () => {
    await useCase.execute(admin, 'c-1');

    expect(repository.delete).toHaveBeenCalledWith('c-1');
    expect(auditTrail.record).toHaveBeenCalledWith(admin, expect.objectContaining({ action: 'Suppression contribuable' }));
  });

  it('refuse de supprimer une fiche qui a des tickets, pour ne pas effacer de recettes', async () => {
    repository.countLinkedRecords.mockResolvedValue({ ...none, tickets: 12, motos: 1 });

    await expect(useCase.execute(admin, 'c-1')).rejects.toThrow(new ConflictError(
      "Suppression impossible : ce contribuable a 12 tickets, 1 moto. Désactivez plutôt sa fiche pour conserver l'historique."
    ));
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('signale une fiche introuvable', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(admin, 'x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
