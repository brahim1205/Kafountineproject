import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { NotificationService } from '../application/NotificationService';

export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  async list(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    return ok(res, await this.notificationService.list(yearFrom(req.query), limit));
  }

  async markRead(req: Request, res: Response) {
    await this.notificationService.markRead(String(req.params.id));
    return message(res, 'Mise à jour effectuée');
  }

  async markAllRead(req: Request, res: Response) {
    await this.notificationService.markAllRead(yearFrom(req.query));
    return message(res, 'Mise à jour effectuée');
  }

  async years(_req: Request, res: Response) {
    return ok(res, await this.notificationService.listYears());
  }

  async currentYear(_req: Request, res: Response) {
    return ok(res, this.notificationService.currentYear());
  }

  async openCurrentYear(req: Request, res: Response) {
    return ok(res, await this.notificationService.openCurrentYear(actorFrom(req)), 201);
  }
}
