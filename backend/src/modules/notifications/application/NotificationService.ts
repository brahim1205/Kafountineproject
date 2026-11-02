import { NotFoundError } from '../../../shared/errors/AppError';
import type { Actor, AuditTrail } from '../../../shared/audit/AuditTrail';
import type { AppNotification, NotificationRepository } from '../domain/Notification';

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly auditTrail: AuditTrail
  ) {}

  async list(year: number, limit: number) {
    await this.repository.ensureSeed(year);
    const rows = await this.repository.list(year, limit);
    return rows.map((row) => this.toView(row));
  }

  async markRead(id: string) {
    if (!(await this.repository.markRead(id))) {
      throw new NotFoundError('Notification introuvable.');
    }
  }

  markAllRead(year: number) {
    return this.repository.markAllRead(year);
  }

  async listYears() {
    const years = await this.repository.listActiveYears();
    const currentYear = new Date().getFullYear();
    return (years.length > 0 ? years : [currentYear]).map((year) => ({ annee: year, estActive: year === currentYear }));
  }

  currentYear() {
    return { annee: new Date().getFullYear(), estActive: true };
  }

  async openCurrentYear(actor: Actor) {
    const current = new Date().getFullYear();
    await this.repository.ensureSeed(current);
    await this.auditTrail.record(actor, {
      action: 'Disponibilisation année',
      module: 'Paramètres',
      details: `Année ${current} rendue disponible dans l’application`,
    });
    return { annee: current, estActive: true };
  }

  private toView(row: AppNotification) {
    return {
      id: row.id,
      userId: row.userId || 'system',
      type: row.type,
      titre: row.titre,
      message: row.message,
      montant: row.montant === null ? null : Number(row.montant),
      contribuable: row.contribuable,
      agent: row.agent,
      lu: row.lu,
      timestamp: row.createdAt.toISOString(),
    };
  }
}
