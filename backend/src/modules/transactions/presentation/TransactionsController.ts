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
import { ListUsedCategoriesUseCase } from '../application/ListUsedCategoriesUseCase';
import { UpdateTransactionUseCase } from '../application/UpdateTransactionUseCase';
import { DeleteTransactionUseCase } from '../application/DeleteTransactionUseCase';

/** Critères de recherche communs à la liste et à l'export (déjà validés par le schéma de requête). */
function criteriaFrom(req: Request) {
  const text = (key: string) => (req.query[key] ? String(req.query[key]) : undefined);
  return {
    search: text('search'),
    categorie: text('categorie'),
    statut: text('statut'),
    agentId: text('agentId'),
    startDate: text('startDate'),
    endDate: text('endDate'),
    year: req.query.year ? Number(req.query.year) : undefined,
  };
}

export class TransactionsController {
  constructor(
    private readonly listCategoriesUseCase: ListTransactionCategoriesUseCase,
    private readonly listCategoryServicesUseCase: ListTransactionCategoryServicesUseCase,
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionStatisticsUseCase: GetTransactionStatisticsUseCase,
    private readonly exportTransactionsUseCase: ExportTransactionsUseCase,
    private readonly listUsedCategoriesUseCase: ListUsedCategoriesUseCase,
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
      ...criteriaFrom(req),
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

  async usedCategories(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.listUsedCategoriesUseCase.execute(year));
  }

  async statistiques(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    return ok(res, await this.getTransactionStatisticsUseCase.execute(year));
  }

  async export(req: Request, res: Response) {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${year}.csv"`);
    // Écrit lot par lot en respectant le débit du client, sans tout garder en mémoire.
    try {
      for await (const chunk of this.exportTransactionsUseCase.execute({ ...criteriaFrom(req), year })) {
        if (!res.write(chunk)) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    } catch (error) {
      // Une fois l'envoi commencé, on ne peut plus répondre en JSON : on coupe le fichier, incomplet.
      if (res.headersSent) {
        res.destroy(error as Error);
        return;
      }
      throw error;
    }
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
