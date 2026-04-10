import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ForbiddenError } from '../../../shared/errors/AppError';
import { clearPortalCookie, setPortalCookie } from '../../../shared/http/cookies';
import { PortalLoginContribuableUseCase } from '../application/PortalLoginContribuableUseCase';
import { GetPortalTaxesUseCase } from '../application/GetPortalTaxesUseCase';
import { InitiatePortalPaymentUseCase } from '../application/InitiatePortalPaymentUseCase';
import { ConfirmPortalPaymentUseCase } from '../application/ConfirmPortalPaymentUseCase';
import { RegisterPortalContribuableUseCase } from '../application/RegisterPortalContribuableUseCase';
import { GetPortalTransactionsUseCase } from '../application/GetPortalTransactionsUseCase';
import { GetPortalReceiptUseCase } from '../application/GetPortalReceiptUseCase';
import { GetPortalProfileUseCase } from '../application/GetPortalProfileUseCase';

export class PortalController {
  constructor(
    private readonly loginContribuableUseCase: PortalLoginContribuableUseCase,
    private readonly registerContribuableUseCase: RegisterPortalContribuableUseCase,
    private readonly getPortalProfileUseCase: GetPortalProfileUseCase,
    private readonly getPortalTaxesUseCase: GetPortalTaxesUseCase,
    private readonly getPortalTransactionsUseCase: GetPortalTransactionsUseCase,
    private readonly initiatePortalPaymentUseCase: InitiatePortalPaymentUseCase,
    private readonly confirmPortalPaymentUseCase: ConfirmPortalPaymentUseCase,
    private readonly getPortalReceiptUseCase: GetPortalReceiptUseCase
  ) {}

  async loginContribuable(req: Request, res: Response) {
    const result = await this.loginContribuableUseCase.execute({
      nin: req.body?.nin ? String(req.body.nin) : undefined,
      telephone: req.body?.telephone ? String(req.body.telephone) : undefined,
    });

    setPortalCookie(res, result.token);
    return res.json(result);
  }

  async registerContribuable(req: Request, res: Response) {
    const result = await this.registerContribuableUseCase.execute({
      nin: String(req.body?.nin || ''),
      nom: String(req.body?.nom || ''),
      prenom: String(req.body?.prenom || ''),
      telephone: req.body?.telephone ? String(req.body.telephone) : undefined,
      adresse: req.body?.adresse ? String(req.body.adresse) : undefined,
      lieuNaiss: req.body?.lieuNaiss ? String(req.body.lieuNaiss) : undefined,
      dateNaiss: req.body?.dateNaiss ? String(req.body.dateNaiss) : undefined,
    });

    setPortalCookie(res, result.token);
    return res.status(201).json(result);
  }

  async me(req: AuthRequest, res: Response) {
    return res.json(await this.getPortalProfileUseCase.execute(req.user!.userId));
  }

  async listTaxes(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    if (authReq.user?.userId !== String(req.params.id)) {
      throw new ForbiddenError('Accès interdit à ces taxes');
    }

    return res.json(await this.getPortalTaxesUseCase.execute(String(req.params.id)));
  }

  async listTransactions(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    if (authReq.user?.userId !== String(req.params.id)) {
      throw new ForbiddenError('Accès interdit à ces transactions');
    }

    return res.json(await this.getPortalTransactionsUseCase.execute(String(req.params.id)));
  }

  async initiatePayment(req: AuthRequest, res: Response) {
    return res.json(await this.initiatePortalPaymentUseCase.execute(req.body || {}, req.user!.userId));
  }

  async confirmPayment(req: AuthRequest, res: Response) {
    return res.json(await this.confirmPortalPaymentUseCase.execute({
      transactionId: req.body?.transactionId ? String(req.body.transactionId) : undefined,
      reference: req.body?.reference ? String(req.body.reference) : undefined,
    }, req.user!.userId));
  }

  async getReceipt(req: AuthRequest, res: Response) {
    return res.json(await this.getPortalReceiptUseCase.execute(String(req.params.id), req.user!.userId));
  }

  async logout(_req: Request, res: Response) {
    clearPortalCookie(res);
    return res.json({ success: true, message: 'Déconnexion portail réussie' });
  }
}
