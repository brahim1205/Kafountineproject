export const STATUTS_CAMION: Record<string, { label: string; badge: string }> = {
  ACTIF: { label: 'Actif', badge: 'bg-green-50 text-green-700' },
  INACTIF: { label: 'Inactif', badge: 'bg-gray-100 text-gray-600' },
};

export const STATUTS_EXPEDITION: Record<string, { label: string; badge: string }> = {
  PLANIFIEE: { label: 'Planifiée', badge: 'bg-amber-50 text-amber-700' },
  EN_COURS: { label: 'En cours', badge: 'bg-blue-50 text-blue-700' },
  LIVREE: { label: 'Livrée', badge: 'bg-green-50 text-green-700' },
  ANNULEE: { label: 'Annulée', badge: 'bg-red-50 text-red-700' },
};

export function StatutBadge({ statut, statuts }: { statut: string; statuts: Record<string, { label: string; badge: string }> }) {
  const known = statuts[statut];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${known?.badge || 'bg-gray-100 text-gray-600'}`}>
      {known?.label || statut}
    </span>
  );
}

export const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500';
export const formatKg = (value?: number | null) => (value ? `${value.toLocaleString('fr-FR')} kg` : '-');
export const formatFcfa = (value?: number | null) => (value ? `${value.toLocaleString('fr-FR')} FCFA` : '-');
export const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR');
