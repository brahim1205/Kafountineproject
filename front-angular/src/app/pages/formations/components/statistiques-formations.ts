import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { FormationStats } from '../../../services/formations';

@Component({
  selector: 'app-statistiques-formations',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './statistiques-formations.html',
})
export class StatistiquesFormations {
  protected readonly Math = Math;

  readonly stats = input<FormationStats | undefined>(undefined);

  protected readonly maxEvolutionAnnuelle = computed(() => Math.max(...(this.stats()?.evolutionAnnuelle || []).map((item) => item.nombre || 0), 1));

  protected readonly totalDomaines = computed(() => (this.stats()?.repartitionDomaines || []).reduce((sum, item) => sum + (item.nombre || 0), 0));

  protected readonly totalSexes = computed(() => (this.stats()?.repartitionSexe || []).reduce((sum, item) => sum + (item.nombre || 0), 0));

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }
}
