import type { Request, Response } from 'express';
import { ok } from '../../../shared/http/response';
import { actorFrom } from '../../../shared/presentation/requestContext';
import type { RapportService } from '../application/RapportService';

function sendPdf(res: Response, { filename, pdf }: { filename: string; pdf: Buffer }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(pdf);
}

export class RapportsController {
  constructor(private readonly rapportService: RapportService) {}

  async exportReceiptPdf(req: Request, res: Response) {
    return sendPdf(res, await this.rapportService.exportReceiptPdf(actorFrom(req), req.body || {}));
  }

  async exportReportPdf(req: Request, res: Response) {
    return sendPdf(res, await this.rapportService.exportReportPdf(actorFrom(req), req.body || {}));
  }

  async reportData(req: Request, res: Response) {
    return ok(res, await this.rapportService.reportData(Number(req.query.year) || new Date().getFullYear()));
  }
}
