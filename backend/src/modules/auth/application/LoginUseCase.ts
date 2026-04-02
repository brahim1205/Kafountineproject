import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { JwtTokenService } from '../../../shared/security/JwtTokenService';
import type { UserRepository } from '../domain/UserRepository';
import type { AuthSessionStore } from '../domain/AuthSessionStore';

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: JwtTokenService,
    private readonly authSessionStore: AuthSessionStore
  ) {}

  async execute(input: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedError('Identifiants invalides');
    }

    const sessionId = randomUUID();
    const token = this.tokenService.signAccessToken({
      userId: user.id,
      sessionId,
      role: user.role,
    });

    const refreshToken = this.tokenService.signRefreshToken({
      userId: user.id,
      sessionId,
    });

    const refreshTtlSeconds = this.parseExpiresInToSeconds(this.tokenService.getRefreshTokenExpiresIn());
    await this.authSessionStore.save(user.id, sessionId, refreshToken, refreshTtlSeconds);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      },
      token,
      accessToken: token,
      refreshToken,
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
