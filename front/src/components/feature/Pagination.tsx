type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  /** Libellé des éléments comptés : « ticket », « entrée »… (au singulier). */
  unit: string;
  onChange: (page: number) => void;
};

/** Pied de liste paginée côté serveur : nombre total, page courante, précédent / suivant. */
export default function Pagination({ page, totalPages, total, unit, onChange }: PaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 px-6 py-3 text-sm text-gray-600">
      <span>
        {total.toLocaleString('fr-FR')} {unit}
        {total > 1 ? 's' : ''} — page {page.toLocaleString('fr-FR')} sur {Math.max(1, totalPages).toLocaleString('fr-FR')}
      </span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => onChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            Précédent
          </button>
          <button
            onClick={() => onChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
