import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { FormationType, JeuneType } from '../page';

@Component({
  selector: 'app-detail-formation',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './detail-formation.html',
})
export class DetailFormation {
  protected readonly Math = Math;

  readonly formation = input.required<FormationType>();

  readonly jeunes = input.required<JeuneType[]>();

  readonly closed = output<void>();

  readonly inscrireJeune = output<void>();

  readonly removeJeune = output<string>();

  protected readonly searchJeune = signal('');

  protected readonly confirmRemoveId = signal<string | null>(null);

  protected readonly activeSection = signal<'inscrits' | 'stats'>('inscrits');

  protected readonly errorMsg = signal('');

  protected formatDate(dateStr: string) {
    try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    });
    }
    catch {
    return dateStr;
    }
    }

  protected formatMontant(montant: number) {
    try {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }
    catch {
    return String(montant);
    }
    }

  protected readonly filteredJeunes = computed(() => this.jeunes().filter((j) => j.nom.toLowerCase().includes(this.searchJeune().toLowerCase()) ||
    j.prenom.toLowerCase().includes(this.searchJeune().toLowerCase()) ||
    j.cni.includes(this.searchJeune())));

  protected readonly hommes = computed(() => this.jeunes().filter((j) => j.sexe === 'M').length);

  protected readonly femmes = computed(() => this.jeunes().filter((j) => j.sexe === 'F').length);

  protected readonly certifies = computed(() => this.jeunes().filter((j) => j.statutFinal === 'Certifié').length);

  protected handleConfirmRemove(id: string) {
    try {
    this.errorMsg.set('');
    this.removeJeune.emit(id);
    }
    catch {
    this.errorMsg.set("Impossible de supprimer ce participant.");
    }
    finally {
    this.confirmRemoveId.set(null);
    }
    }

  protected countByNiveau(niveau: string) {
    return this.jeunes().filter((j) => j.niveauEtude === niveau).length;
  }

  protected countByStatut(s: { label: string }) {
    return this.jeunes().filter((j) => j.statutFinal === s.label).length;
  }

  protected jeunesSummary3() {
    return [...this.jeunes()]
    .sort((a, b) => b.tauxAssiduite - a.tauxAssiduite)
    .slice(0, 5);
  }
}
