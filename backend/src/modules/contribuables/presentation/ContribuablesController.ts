import type { Request, Response } from 'express';
import { message, ok, okWithMeta } from '../../../shared/http/response';
import { CheckTelephoneUseCase } from '../application/CheckTelephoneUseCase';
import { ListContribuablesUseCase } from '../application/ListContribuablesUseCase';
import { CreateContribuableUseCase } from '../application/CreateContribuableUseCase';
import { UpdateContribuableUseCase } from '../application/UpdateContribuableUseCase';
import { DeleteContribuableUseCase } from '../application/DeleteContribuableUseCase';

export class ContribuablesController {
  constructor(
    private readonly checkTelephoneUseCase: CheckTelephoneUseCase,
    private readonly listContribuablesUseCase: ListContribuablesUseCase,
    private readonly createContribuableUseCase: CreateContribuableUseCase,
    private readonly updateContribuableUseCase: UpdateContribuableUseCase,
    private readonly deleteContribuableUseCase: DeleteContribuableUseCase
  ) {}

  async checkTelephone(req: Request, res: Response) {
    const data = await this.checkTelephoneUseCase.execute(String(req.query.telephone || ''));
    return ok(res, data);
  }

  async list(req: Request, res: Response) {
    const result = await this.listContribuablesUseCase.execute({
      search: String(req.query.search || '').trim() || undefined,
      isActive: req.query.statut === 'actif' ? true : req.query.statut === 'inactif' ? false : undefined,
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(100, Math.max(1, Number(req.query.limit || 20))),
    });

    return okWithMeta(res, result.data, result.meta);
  }

  async create(req: Request, res: Response) {
    const created = await this.createContribuableUseCase.execute({
      nin: String(req.body?.nin),
      nom: String(req.body?.nom),
      prenom: String(req.body?.prenom),
      dateNaiss: String(req.body?.dateNaiss),
      lieuNaiss: String(req.body?.lieuNaiss),
      adresse: String(req.body?.adresse),
      telephone: String(req.body?.telephone),
      email: req.body?.email ? String(req.body.email) : undefined,
      profession: req.body?.profession ? String(req.body.profession) : undefined,
      typeContribuable: req.body?.typeContribuable ? String(req.body.typeContribuable) : undefined,
      zone: req.body?.zone ? String(req.body.zone) : undefined,
      montantImpot: req.body?.montantImpot ? Number(req.body.montantImpot) : undefined,
      isActive: req.body?.isActive,
    });

    return ok(res, created, 201);
  }

  async update(req: Request, res: Response) {
    const updated = await this.updateContribuableUseCase.execute(String(req.params.id), req.body || {});
    return ok(res, updated);
  }

  async delete(req: Request, res: Response) {
    await this.deleteContribuableUseCase.execute(String(req.params.id));
    return message(res, 'Contribuable supprimé avec succès');
  }
}
