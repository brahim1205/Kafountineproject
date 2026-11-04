/** Séries de numéros officiels (tickets, actes, dossiers, reçus), numérotées par année. */
export type NumeroSeries = 'transaction' | 'etatCivil' | 'urbanisme' | 'commission' | 'expedition' | 'recuMoto';

/**
 * Attribue le numéro suivant d'une série (« EC-2026-00042 »). Les numéros se suivent et ne se
 * répètent pas, même quand deux agents enregistrent au même instant. À appeler dans la transaction
 * qui enregistre le document, pour que le numéro ne soit réservé que si l'écriture aboutit.
 */
export interface NumeroSequence {
  next(series: NumeroSeries, year: number): Promise<string>;
}
