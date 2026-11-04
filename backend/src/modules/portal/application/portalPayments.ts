import { AppError } from '../../../shared/errors/AppError';
import { env } from '../../../shared/config/env';

export const PORTAL_PAYMENTS_UNAVAILABLE =
  "Le paiement en ligne n'est pas encore disponible. Réglez vos taxes au guichet de la mairie, muni de votre NIN.";

export function portalPaymentsAvailability() {
  return { enabled: env.portalOnlinePayments, message: env.portalOnlinePayments ? null : PORTAL_PAYMENTS_UNAVAILABLE };
}

/** Refuse toute initialisation ou confirmation tant qu'aucun opérateur de paiement ne confirme l'encaissement. */
export function assertPortalPaymentsEnabled() {
  if (!env.portalOnlinePayments) {
    throw new AppError(503, PORTAL_PAYMENTS_UNAVAILABLE);
  }
}
