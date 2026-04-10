import type { Request, Response } from 'express';
import { ok, message } from '../../../shared/http/response';
import type { AuthRequest } from '../../../shared/types/AuthRequest';
import { LoginUseCase } from '../application/LoginUseCase';
import { GetCurrentUserUseCase } from '../application/GetCurrentUserUseCase';
import { RequestPasswordResetUseCase } from '../application/RequestPasswordResetUseCase';
import { RefreshTokenUseCase } from '../application/RefreshTokenUseCase';
import { LogoutUseCase } from '../application/LogoutUseCase';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { clearAuthCookies, clearPortalCookie, readCookie, setAuthCookies, REFRESH_TOKEN_COOKIE } from '../../../shared/http/cookies';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  async login(req: Request, res: Response) {
    const data = await this.loginUseCase.execute({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });

    setAuthCookies(res, data.accessToken, data.refreshToken);
    return ok(res, data);
  }

  async logout(req: AuthRequest, res: Response) {
    await this.logoutUseCase.execute(req.user!.userId, req.user?.sessionId);
    clearAuthCookies(res);
    clearPortalCookie(res);
    return message(res, 'Déconnexion réussie');
  }

  async me(req: AuthRequest, res: Response) {
    const data = await this.getCurrentUserUseCase.execute(req.user!.userId);
    return ok(res, data);
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.body?.refreshToken || readCookie(req, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token requis');
    }

    const data = await this.refreshTokenUseCase.execute(String(refreshToken));
    setAuthCookies(res, data.accessToken, data.refreshToken);
    return ok(res, data);
  }

  async forgotPassword(req: Request, res: Response) {
    const text = await this.requestPasswordResetUseCase.execute(String(req.body?.email || ''));
    return message(res, text);
  }
}
