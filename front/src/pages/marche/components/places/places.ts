import type { PlaceMarche } from '../../../../services/marche';

export type PlaceStatut = 'Occupée' | 'Disponible';

export type UiPlace = PlaceMarche & {
  numero: string;
  statut: PlaceStatut;
};

export const TYPES_PLACE = ['Place', 'Boutique', 'Kiosque', 'Hangar', 'Étal'];
export const ACTIVITES = [
  'Fruits et légumes',
  'Poissonnerie',
  'Boucherie',
  'Épicerie',
  'Vêtements',
  'Chaussures',
  'Électronique',
  'Restauration',
  'Autre',
];
export const PERIODES = [
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'annee', label: 'Année' },
];

export const INPUT_CLASS =
  'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500';

export function toUiPlace(place: PlaceMarche): UiPlace {
  return {
    ...place,
    numero: place.numero || place.numeroPlace || '-',
    statut: place.statut === 'OCCUPEE' ? 'Occupée' : 'Disponible',
  };
}

/** Valeurs de référence complétées par celles déjà présentes dans les données, triées. */
export function optionsFrom(base: string[], values: Array<string | null | undefined>) {
  return Array.from(new Set([...base, ...values.filter((value): value is string => Boolean(value))])).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

export function formatTarif(place: Pick<UiPlace, 'tarif' | 'periode'>) {
  return `${place.tarif.toLocaleString()} FCFA/${place.periode}`;
}

export function statutBadge(statut: PlaceStatut) {
  return statut === 'Occupée' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700';
}
