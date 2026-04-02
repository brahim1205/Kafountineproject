import { UnauthorizedError } from '../../../shared/errors/AppError';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { UserRepository } from '../domain/UserRepository';
import type { AuthSessionStore } from '../domain/AuthSessionStore';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: JwtTokenService,
    private readonly authSessionStore: AuthSessionStore
  ) {}

  async execute(refreshToken: string) {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const storedRefreshToken = await this.authSessionStore.find(payload.userId, payload.sessionId);

    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      throw new UnauthorizedError('Refresh token invalide');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Utilisateur introuvable');
    }

    const newAccessToken = this.tokenService.signAccessToken({
      userId: user.id,
      sessionId: payload.sessionId,
      role: user.role,
    });

    const newRefreshToken = this.tokenService.signRefreshToken({
      userId: user.id,
      sessionId: payload.sessionId,
    });

    const refreshTtlSeconds = this.parseExpiresInToSeconds(this.tokenService.getRefreshTokenExpiresIn());
    await this.authSessionStore.save(user.id, payload.sessionId, newRefreshToken, refreshTtlSeconds);

    return {
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  private parseExpiresInToSeconds(value: string) {
    const match = /^(\d+)([smhd])$/i.exec(value.trim());
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return amount * multipliers[unit];
  }
}
