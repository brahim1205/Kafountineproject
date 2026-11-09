import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

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

export const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500';

export const formatKg = (value?: number | null) => (value ? `${value.toLocaleString('fr-FR')} kg` : '-');

export const formatFcfa = (value?: number | null) => (value ? `${value.toLocaleString('fr-FR')} FCFA` : '-');

export const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR');

@Component({
  selector: 'app-statut-badge',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './statut-badge.html',
})
export class StatutBadge {

  readonly statut = input.required<string>();

  readonly statuts = input.required<Record<string, { label: string; badge: string }>>();

  protected readonly known = computed(() => this.statuts()[this.statut()]);
}
