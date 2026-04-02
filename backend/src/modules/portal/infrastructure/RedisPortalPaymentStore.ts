import type { PortalPaymentStore, PendingPortalPayment } from '../domain/PortalPaymentStore';
import { getRedisClient } from '../../../shared/infrastructure/redis/getRedisClient';

const PAYMENT_TTL_SECONDS = 15 * 60;

export class RedisPortalPaymentStore implements PortalPaymentStore {
  private buildKey(paymentId: string) {
    return `portal:payment:${paymentId}`;
  }

  async save(payment: PendingPortalPayment) {
    const client = await getRedisClient();
    if (!client) {
      throw new Error('Redis indisponible pour stocker le paiement portail');
    }

    await client.set(this.buildKey(payment.paymentId), JSON.stringify(payment), {
      EX: PAYMENT_TTL_SECONDS,
    });
  }

  async find(paymentId: string) {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const value = await client.get(this.buildKey(paymentId));
    if (!value) {
      return null;
    }

    return JSON.parse(value) as PendingPortalPayment;
  }

  async delete(paymentId: string) {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    await client.del(this.buildKey(paymentId));
  }
}
