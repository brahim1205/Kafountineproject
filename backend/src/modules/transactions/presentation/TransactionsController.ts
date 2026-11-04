import { actorFrom } from '../../../shared/presentation/requestContext';
import type { Request, Response } from 'express';
import { ok, okWithMeta } from '../../../shared/http/response';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { ListTransactionCategoriesUseCase } from '../application/ListTransactionCategoriesUseCase';
import { ListTransactionCategoryServicesUseCase } from '../application/ListTransactionCategoryServicesUseCase';
import { ListTransactionsUseCase } from '../application/ListTransactionsUseCase';
import { CreateTransactionUseCase } from '../application/CreateTransactionUseCase';
import { GetTransactionStatisticsUseCase } from '../application/GetTransactionStatisticsUseCase';
import { ExportTransactionsUseCase } from '../application/ExportTransactionsUseCase';
import { UpdateTransactionUseCase } from '../application/UpdateTransactionUseCase';
import { DeleteTransactionUseCase } from '../application/DeleteTransactionUseCase';

export class TransactionsController {
  constructor(
    private readonly listCategoriesUseCase: ListTransactionCategoriesUseCase,
    private readonly listCategoryServicesUseCase: ListTransactionCategoryServicesUseCase,
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionStatisticsUseCase: GetTransactionStatisticsUseCase,
    private readonly exportTransactionsUseCase: ExportTransactionsUseCase,
    private readonly updateTransactionUseCase: UpdateTransactionUseCase,
    private readonly deleteTransactionUseCase: DeleteTransactionUseCase
  ) {}

  async categories(_req: Request, res: Response) {
    return ok(res, await this.listCategoriesUseCase.execute());
  }

  async categoryServices(req: Request, res: Response) {
    return ok(res, await this.listCategoryServicesUseCase.execute(String(req.params.id)));
  }

  async list(req: Request, res: Response) {
    const result = await this.listTransactionsUseCase.execute({
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(300, Math.max(1, Number(req.query.limit || 20))),
      search: req.query.search ? String(req.query.search) : undefined,
      categorie: req.query.categorie ? String(req.query.categorie) : undefined,
      statut: req.query.statut ? String(req.query.statut) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
    });

    return okWithMeta(res, result.data, result.meta);
  }

  async create(req: AuthRequest, res: Response) {
    const created = await this.createTransactionUseCase.execute(actorFrom(req), {
      ...req.body,
      agentId: req.user!.userId,
    });

    return ok(res, created, 201);
  }

  async statistiques(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.getTransactionStatisticsUseCase.execute(year));
  }

  async export(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(this.exportTransactionsUseCase.execute());
  }

  async update(req: Request, res: Response) {
    const updated = await this.updateTransactionUseCase.execute(actorFrom(req), String(req.params.id), req.body);
    return ok(res, updated);
  }

  async delete(req: Request, res: Response) {
    await this.deleteTransactionUseCase.execute(actorFrom(req), String(req.params.id));
    return ok(res, { success: true });
  }
}
