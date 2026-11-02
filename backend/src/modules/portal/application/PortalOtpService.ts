import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../../shared/config/env';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { getRedisClient } from '../../../shared/infrastructure/redis/getRedisClient';

type PortalOtpRecord = {
  contribuableId: string;
  codeHash: string;
  attempts: number;
  expiresAt: number;
};

const fallbackOtpRecords = new Map<string, PortalOtpRecord>();
const MAX_ATTEMPTS = 5;

export type PortalOtpChallenge = {
  requestId: string;
  expiresInSeconds: number;
  devCode?: string;
};

export class PortalOtpService {
  private buildKey(requestId: string) {
    return `portal:otp:${requestId}`;
  }

  private hashCode(requestId: string, code: string) {
    return createHmac('sha256', env.jwtSecret)
      .update(`${requestId}:${code}`)
      .digest('hex');
  }

  private codesMatch(expectedHash: string, requestId: string, code: string) {
    const actualHash = this.hashCode(requestId, code);
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(actualHash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async createChallenge(contribuableId: string, telephone: string): Promise<PortalOtpChallenge> {
    const requestId = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ttlSeconds = env.portalOtpTtlSeconds;
    const record: PortalOtpRecord = {
      contribuableId,
      codeHash: this.hashCode(requestId, code),
      attempts: 0,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    const client = await getRedisClient();
    if (client) {
      await client.set(this.buildKey(requestId), JSON.stringify(record), { EX: ttlSeconds });
    } else {
      fallbackOtpRecords.set(requestId, record);
    }

    await this.deliverCode({ requestId, telephone, code, expiresInSeconds: ttlSeconds });

    return {
      requestId,
      expiresInSeconds: ttlSeconds,
      ...(env.isProduction ? {} : { devCode: code }),
    };
  }

  private async deliverCode(input: { requestId: string; telephone: string; code: string; expiresInSeconds: number }) {
    if (env.portalOtpDeliveryMode === 'dev') {
      if (!env.isProduction) {
        process.stdout.write(`Portal OTP dev code for ${input.telephone}: ${input.code}\n`);
        return;
      }
      throw new Error('Le mode de livraison OTP dev est interdit en production.');
    }

    if (env.portalOtpDeliveryMode !== 'webhook') {
      throw new Error(`Mode de livraison OTP non supporté: ${env.portalOtpDeliveryMode}`);
    }

    const response = await fetch(env.portalOtpWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.portalOtpWebhookToken ? { Authorization: `Bearer ${env.portalOtpWebhookToken}` } : {}),
      },
      body: JSON.stringify({
        channel: 'sms',
        to: input.telephone,
        code: input.code,
        requestId: input.requestId,
        expiresInSeconds: input.expiresInSeconds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Échec livraison OTP portail (${response.status})`);
    }
  }

  async verifyChallenge(requestId: string, code: string): Promise<string> {
    const record = await this.readRecord(requestId);
    if (!record || record.expiresAt <= Date.now()) {
      await this.deleteChallenge(requestId);
      throw new UnauthorizedError('Code de vérification invalide ou expiré');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.deleteChallenge(requestId);
      throw new UnauthorizedError('Trop de tentatives de vérification');
    }

    if (!this.codesMatch(record.codeHash, requestId, code)) {
      record.attempts += 1;
      await this.saveRecord(requestId, record);
      throw new UnauthorizedError('Code de vérification invalide ou expiré');
    }

    await this.deleteChallenge(requestId);
    return record.contribuableId;
  }

  private async readRecord(requestId: string): Promise<PortalOtpRecord | null> {
    const client = await getRedisClient();
    if (client) {
      const raw = await client.get(this.buildKey(requestId));
      return raw ? JSON.parse(raw) as PortalOtpRecord : null;
    }

    return fallbackOtpRecords.get(requestId) ?? null;
  }

  private async saveRecord(requestId: string, record: PortalOtpRecord) {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));
    const client = await getRedisClient();
    if (client) {
      await client.set(this.buildKey(requestId), JSON.stringify(record), { EX: ttlSeconds });
      return;
    }

    fallbackOtpRecords.set(requestId, record);
  }

  private async deleteChallenge(requestId: string) {
    const client = await getRedisClient();
    if (client) {
      await client.del(this.buildKey(requestId));
      return;
    }

    fallbackOtpRecords.delete(requestId);
  }
}
