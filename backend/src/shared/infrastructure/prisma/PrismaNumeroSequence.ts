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
 * Cas courant : le compteur de la série existe, on l'incrémente. La ligne reste verrouillée jusqu'au
 * commit de la transaction de l'écriture, ce qui ordonne les enregistrements simultanés ; si l'écriture
 * échoue, l'incrément est annulé avec elle (pas de trou dans la numérotation).
 */
const INCREMENT_SQL = `UPDATE "NumeroCounter" SET "dernier" = "dernier" + 1
  WHERE "serie" = $1 AND "annee" = $2 RETURNING "dernier"`;

/**
 * Première utilisation de la série pour l'année : le compteur démarre après le plus grand numéro déjà
 * en base, comparé comme un nombre (un tri sur le texte classerait « TX-2026-999 » après
 * « TX-2026-1000 »). Si deux premières attributions se croisent, ON CONFLICT reprend l'incrément.
 * Requêtes figées au chargement du module à partir des seules définitions ci-dessus.
 */
const INITIALIZE_SQL = Object.fromEntries(
  Object.entries(SERIES).map(([series, { table, column }]) => [
    series,
    `INSERT INTO "NumeroCounter" ("serie", "annee", "dernier")
     SELECT $1::text, $2::int, COALESCE(MAX(CAST(substring("${column}" from '([0-9]+)$') AS bigint)), 0)::int + 1
     FROM "${table}" WHERE "${column}" LIKE $3
     ON CONFLICT ("serie", "annee") DO UPDATE SET "dernier" = "NumeroCounter"."dernier" + 1
     RETURNING "dernier"`,
  ])
) as Record<NumeroSeries, string>;

/** Le numéro est-il déjà pris ? Recherche sur l'index unique, en temps constant. */
const EXISTS_SQL = Object.fromEntries(
  Object.entries(SERIES).map(([series, { table, column }]) => [
    series,
    `SELECT 1 AS pris FROM "${table}" WHERE "${column}" = $1 LIMIT 1`,
  ])
) as Record<NumeroSeries, string>;

/**
 * Compteur en retard sur la base (sauvegarde restaurée, numéro saisi à la main) : on le recale après
 * le plus grand numéro existant. Cas rare, seul à parcourir les numéros de l'année.
 */
const RESYNC_SQL = Object.fromEntries(
  Object.entries(SERIES).map(([series, { table, column }]) => [
    series,
    `UPDATE "NumeroCounter" SET "dernier" = GREATEST("dernier", (
       SELECT COALESCE(MAX(CAST(substring("${column}" from '([0-9]+)$') AS bigint)), 0)::int
       FROM "${table}" WHERE "${column}" LIKE $3
     )) + 1
     WHERE "serie" = $1 AND "annee" = $2 RETURNING "dernier"`,
  ])
) as Record<NumeroSeries, string>;

export class PrismaNumeroSequence implements NumeroSequence {
  next(series: NumeroSeries, year: number) {
    const { prefix, width } = SERIES[series];
    const stem = `${prefix}-${year}-`;
    return inTransaction(async (tx) => {
      let [row] = await tx.$queryRawUnsafe<Array<{ dernier: number }>>(INCREMENT_SQL, series, year);
      if (!row) {
        [row] = await tx.$queryRawUnsafe<Array<{ dernier: number }>>(INITIALIZE_SQL[series], series, year, `${stem}%`);
      }
      const format = (value: number) => `${stem}${String(Number(value)).padStart(width, '0')}`;
      const [taken] = await tx.$queryRawUnsafe<unknown[]>(EXISTS_SQL[series], format(row.dernier));
      if (taken) {
        [row] = await tx.$queryRawUnsafe<Array<{ dernier: number }>>(RESYNC_SQL[series], series, year, `${stem}%`);
      }
      return format(row.dernier);
    });
  }
}
