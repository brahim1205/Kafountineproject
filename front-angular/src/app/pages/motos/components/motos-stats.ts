import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MotoStats } from '../../../services/motos';

const CARDS = [
  { label: 'Total Motos', key: 'totalMotos', icon: 'ri-motorbike-line', tone: 'emerald' },
  { label: 'Paiements ce mois', key: 'paiementsMois', icon: 'ri-checkbox-circle-line', tone: 'blue' },
  { label: 'En retard', key: 'enRetard', icon: 'ri-alarm-warning-line', tone: 'red' },
  { label: 'Recettes du mois', key: 'recettesMois', icon: 'ri-money-dollar-circle-line', tone: 'teal' },
] as const;

const TONES = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  teal: 'bg-emerald-100 text-emerald-600',
};

@Component({
  selector: 'app-motos-stats',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './motos-stats.html',
})
export class MotosStats {
  protected readonly CARDS = CARDS;
  protected readonly TONES = TONES;

  readonly stats = input.required<MotoStats>();
}
