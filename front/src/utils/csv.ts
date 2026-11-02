export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Sérialise des lignes en CSV (RFC 4180) : les cellules contenant virgule, guillemet ou saut de ligne sont entourées de guillemets. */
export function toCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/** Déclenche le téléchargement d'un fichier CSV ; le BOM permet à Excel de lire les accents. */
export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Suffixe de date (AAAA-MM-JJ) pour les noms de fichiers exportés. */
export function today() {
  return new Date().toISOString().split('T')[0];
}
