import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { FormationType, JeuneType } from '../page';

@Component({
  selector: 'app-jeune-card',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './jeune-card.html',
})
export class JeuneCard {

  readonly jeune = input.required<JeuneType>();

  readonly formations = input.required<FormationType[]>();

  readonly remove = output<string>();

  protected readonly showConfirmRemove = signal(false);

  protected readonly errorMsg = signal('');

  protected readonly formation = computed(() => this.formations().find((f) => f.id === this.jeune().formationId));

  protected getStatutColor(statut: string) {
    switch (statut) {
    case 'Certifié':
    return 'bg-green-50 text-green-700';
    case 'En cours':
    return 'bg-emerald-50 text-emerald-700';
    case 'Abandon':
    return 'bg-red-50 text-red-700';
    default:
    return 'bg-gray-50 text-gray-700';
    }
    }

  protected readonly formationName = computed(() => this.formation()?.nom ?? 'Formation inconnue');

  protected on1() {
    try {
    this.errorMsg.set('');
    this.remove.emit(this.jeune().id);
    }
    catch {
    this.errorMsg.set("Impossible de retirer ce participant.");
    }
    finally {
    this.showConfirmRemove.set(false);
    }
    }
}
