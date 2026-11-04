import type { NumeroSequence, NumeroSeries } from '../../domain/NumeroSequence';
import { inTransaction } from './transactionContext';

type SeriesDefinition = { prefix: string; width: number; table: string; column: string };

const SERIES: Record<NumeroSeries, SeriesDefinition> = {
  transaction: { prefix: 'TX', width: 3, table: 'Transaction', column: 'numero' },
  etatCivil: { prefix: 'EC', width: 5, table: 'EtatCivilRequest', column: 'numero' },
  urbanisme: { prefix: 'URB', width: 5, table: 'UrbanismeCase', column: 'numero' },
  commission: { prefix: 'CF', width: 5, table: 'FishCommission', column: 'numero' },
  expedition: { prefix: 'EXP', width: 5, table: 'ShippingExpedition', column: 'numero' },
  recuMoto: { prefix: 'MOTO', width: 5, table: 'MotoPayment', column: 'numeroRecu' },
};

/**
 * Plus grand numéro de la série pour l'année, comparé comme un nombre : un tri sur le texte
 * classerait « TX-2026-999 » après « TX-2026-1000 » et redonnerait un numéro déjà pris.
 * Requêtes figées au chargement du module à partir des seules définitions ci-dessus.
 */
const LAST_NUMBER_SQL = Object.fromEntries(
  Object.entries(SERIES).map(([series, { table, column }]) => [
    series,
    `SELECT COALESCE(MAX(CAST(substring("${column}" from '([0-9]+)$') AS bigint)), 0)::float8 AS last
     FROM "${table}" WHERE "${column}" LIKE $1`,
  ])
) as Record<NumeroSeries, string>;

export class PrismaNumeroSequence implements NumeroSequence {
  next(series: NumeroSeries, year: number) {
    const { prefix, width } = SERIES[series];
    const stem = `${prefix}-${year}-`;
    // Rejoint la transaction de l'écriture : le verrou tient jusqu'à son commit, qui rend le numéro visible.
    return inTransaction(async (tx) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `numero:${stem}`);
      const [row] = await tx.$queryRawUnsafe<Array<{ last: number }>>(LAST_NUMBER_SQL[series], `${stem}%`);
      return `${stem}${String(Number(row?.last || 0) + 1).padStart(width, '0')}`;
    });
  }
}
