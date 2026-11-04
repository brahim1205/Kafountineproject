import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import type { ContribuableRepository } from '../domain/ContribuableRepository';

const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count > 1 ? pluralForm : singular}`;

/**
 * Supprimer un contribuable efface en cascade ses tickets, actes, dossiers et motos : des recettes
 * encaissées disparaîtraient des comptes. La suppression n'est donc permise que pour une fiche sans
 * aucune pièce rattachée (doublon, erreur de saisie) ; sinon on désactive la fiche.
 */
export class DeleteContribuableUseCase {
  constructor(
    private readonly contribuableRepository: ContribuableRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async execute(actor: Actor, id: string) {
    const existing = await this.contribuableRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Contribuable introuvable');
    }

    const linked = await this.contribuableRepository.countLinkedRecords(id);
    const parts = [
      linked.tickets && plural(linked.tickets, 'ticket', 'tickets'),
      linked.etatCivil && plural(linked.etatCivil, "demande d'état civil", "demandes d'état civil"),
      linked.urbanisme && plural(linked.urbanisme, "dossier d'urbanisme", "dossiers d'urbanisme"),
      linked.motos && plural(linked.motos, 'moto', 'motos'),
    ].filter(Boolean);
    if (parts.length > 0) {
      throw new ConflictError(
        `Suppression impossible : ce contribuable a ${parts.join(', ')}. Désactivez plutôt sa fiche pour conserver l'historique.`
      );
    }

    await this.contribuableRepository.delete(id);
    await this.auditTrail.record(actor, {
      action: 'Suppression contribuable',
      module: 'Contribuables',
      details: `Suppression de la fiche ${existing.prenom || ''} ${existing.nom || ''} (${existing.nin})`.replace(/\s+/g, ' '),
      status: 'warning',
    });
  }
}
