import type { Request, Response } from 'express';
import { message, ok } from '../../../shared/http/response';
import { actorFrom, yearFrom } from '../../../shared/presentation/requestContext';
import type { AuditService } from '../application/AuditService';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  async list(req: Request, res: Response) {
    return ok(
      res,
      await this.auditService.list({
        page: Math.max(1, Number(req.query.page || 1)),
        limit: Math.max(1, Number(req.query.limit || 20)),
        year: yearFrom(req.query),
        search: String(req.query.search || '').trim(),
        module: String(req.query.module || '').trim(),
        status: String(req.query.statut || '').trim().toLowerCase(),
      })
    );
  }

  async seed(req: Request, res: Response) {
    await this.auditService.seed(actorFrom(req));
    return message(res, 'Log de démonstration généré');
  }

  async exportCsv(req: Request, res: Response) {
    const exported = await this.auditService.exportCsv(yearFrom(req.body));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  }
}
