import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';

interface Formation {
  id: string;
  nom: string;
}

interface Jeune {
  id: string;
  formationId: string;
  nom: string;
  prenom: string;
  photo: string;
  tauxAssiduite: number;
}

@Component({
  selector: 'app-gestion-presence',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './gestion-presence.html',
})
export class GestionPresence {

  readonly formationId = input.required<string>();

  readonly formations = input.required<Formation[]>();

  readonly jeunes = input.required<Jeune[]>();

  readonly closed = output<void>();

  protected readonly formation = computed(() => this.formations().find(f => f.id === this.formationId()));

  protected readonly jeunesFormation = computed(() => this.jeunes().filter(j => j.formationId === this.formationId()));

  protected readonly datePresence = signal(new Date().toISOString().split('T')[0]);

  protected readonly presences = signal<Record<string, boolean>>(Object.fromEntries(this.jeunesFormation().map(j => [j.id, true])));

  protected handleTogglePresence(jeuneId: string) {
    this.presences.update(prev => ({ ...prev, [jeuneId]: !prev[jeuneId] }));
    }

  protected handleSubmit(e: Event) {
    e.preventDefault();
    this.closed.emit();
    }

  protected readonly nombrePresents = computed(() => Object.values(this.presences()).filter(p => p).length);

  protected readonly nombreAbsents = computed(() => this.jeunesFormation().length - this.nombrePresents());
}
