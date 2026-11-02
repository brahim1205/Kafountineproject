import type { Request, Response } from 'express';
import { ok, message } from '../../../shared/http/response';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { PlaceholderUsersService } from './PlaceholderUsersService';
import { PlaceholderSupportService } from './PlaceholderSupportService';

export class PlaceholderUsersController {
  private readonly usersService: PlaceholderUsersService;

  constructor(supportService: PlaceholderSupportService) {
    this.usersService = new PlaceholderUsersService(supportService);
  }

  async listUsers(req: Request, res: Response) {
    return ok(res, await this.usersService.listUsers(String(req.query.search || '')));
  }

  async createUser(req: Request, res: Response) {
    return ok(res, await this.usersService.createUser(req as AuthRequest), 201);
  }

  async updateUser(req: Request, res: Response) {
    return ok(res, await this.usersService.updateUser(req as AuthRequest, String(req.params.id)));
  }

  async deleteUser(req: Request, res: Response) {
    const result = await this.usersService.deleteUser(req as AuthRequest, String(req.params.id));
    return message(res, result.message);
  }
}
