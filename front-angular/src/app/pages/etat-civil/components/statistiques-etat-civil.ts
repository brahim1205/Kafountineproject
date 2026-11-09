import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { EtatCivilStats } from '../../../services/etat-civil';
import { YearService } from '../../../core/year/year.service';
import { EtatCivilApi } from '../../../services/etat-civil';

interface IEtatCivilStats {
  totalDemandes: number;
  demandesEnAttente: number;
  demandesDelivrees: number;
  demandesRejetees: number;
  recettes: number;
}

@Component({
  selector: 'app-statistiques-etat-civil',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './statistiques-etat-civil.html',
})
export class StatistiquesEtatCivil {
  protected readonly yearService = inject(YearService);
  protected readonly etatCivilApi = inject(EtatCivilApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly showSuccessMessage = signal(false);

  protected readonly exportType = signal('');

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly stats = signal<IEtatCivilStats>({
    totalDemandes: 0,
    demandesEnAttente: 0,
    demandesDelivrees: 0,
    demandesRejetees: 0,
    recettes: 0,
    });

  protected async loadStats() {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const response = await this.etatCivilApi.getEtatCivilStats(this.selectedYear());
    if (response) {
    const typed = response as EtatCivilStats & Partial<IEtatCivilStats>;
    this.stats.set({
    totalDemandes: typed.totalDemandes || 0,
    demandesEnAttente: typed.demandesEnAttente || typed.enAttente || 0,
    demandesDelivrees: typed.demandesDelivrees || typed.validees || 0,
    demandesRejetees: typed.demandesRejetees || 0,
    recettes: typed.recettes || 0,
    });
    }
    }
    catch {
    this.stats.set({
    totalDemandes: 0,
    demandesEnAttente: 0,
    demandesDelivrees: 0,
    demandesRejetees: 0,
    recettes: 0,
    });
    this.errorMsg.set("Impossible de charger les statistiques de l'état civil.");
    }
    finally {
    this.loading.set(false);
    }
    }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }

  protected readonly statsData = computed(() => [
    { label: 'Total demandes', value: this.stats().totalDemandes.toString(), icon: 'ri-file-text-line', color: 'emerald' },
    { label: 'En attente', value: this.stats().demandesEnAttente.toString(), icon: 'ri-time-line', color: 'amber' },
    { label: 'Délivrées', value: this.stats().demandesDelivrees.toString(), icon: 'ri-check-line', color: 'teal' },
    { label: 'Recettes totales', value: `${this.formatMontant(this.stats().recettes)} Fcfa`, icon: 'ri-money-dollar-circle-line', color: 'cyan' }
    ]);

  protected handleExport(type: 'excel' | 'pdf') {
    this.exportType.set(type);
    this.showSuccessMessage.set(true);
    const link = document.createElement('a');
    link.href = '#';
    link.download = `statistiques-etat-civil-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
    this.showSuccessMessage.set(false);
    }, 3000);
    }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadStats();
      });
    });
  }
}
