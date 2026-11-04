// Doublures des ports partagés, pour les tests unitaires des services (jamais importé par l'application).
import type { Actor, ActorDirectory, AuditTrail } from '../audit/AuditTrail';
import type { ContribuableLookup, ContribuableSummary } from '../domain/ContribuableLookup';
import type { NumeroSequence } from '../domain/NumeroSequence';

export const agent: Actor = { userId: 'user-agent', role: 'AGENT', ipAddress: '127.0.0.1' };
export const admin: Actor = { userId: 'user-admin', role: 'ADMIN', ipAddress: '127.0.0.1' };

export function fakeAuditTrail(): jest.Mocked<AuditTrail> {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

export function fakeActorDirectory(name = 'Awa Badji'): jest.Mocked<ActorDirectory> {
  return { displayName: jest.fn().mockResolvedValue(name) };
}

export function contribuable(overrides: Partial<ContribuableSummary> = {}): ContribuableSummary {
  return {
    id: 'contrib-1',
    nom: 'Diatta',
    prenom: 'Awa',
    nin: '1988000000999',
    telephone: '770001122',
    adresse: 'Kafountine',
    ...overrides,
  };
}

/** Annuaire des contribuables : renvoie ceux passés en paramètre, null pour tout autre identifiant. */
export function fakeContribuables(...known: ContribuableSummary[]): jest.Mocked<ContribuableLookup> {
  return { findById: jest.fn(async (id: string) => known.find((item) => item.id === id) || null) };
}

const SERIES_PREFIX = { transaction: 'TX', etatCivil: 'EC', urbanisme: 'URB', commission: 'CF', expedition: 'EXP', recuMoto: 'MOTO' };

/** Numérotation : « EC-2026-00001 », « EC-2026-00002 »… par série et par année. */
export function fakeNumeroSequence(): jest.Mocked<NumeroSequence> {
  const counters = new Map<string, number>();
  return {
    next: jest.fn(async (series, year) => {
      const key = `${series}-${year}`;
      const value = (counters.get(key) || 0) + 1;
      counters.set(key, value);
      return `${SERIES_PREFIX[series]}-${year}-${String(value).padStart(5, '0')}`;
    }),
  };
}
