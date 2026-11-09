import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { YearService } from '../../../core/year/year.service';
import { UrbanismeApi } from '../../../services/urbanisme';

interface UrbanismeStats {
  totalDossiers: number;
  dossiersEnAttente: number;
  dossiersValides: number;
  dossiersRejetes: number;
  recettes: number;
}

@Component({
  selector: 'app-statistiques-urbanisme',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './statistiques-urbanisme.html',
})
export class StatistiquesUrbanisme {
  protected readonly Math = Math;
  protected readonly yearService = inject(YearService);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly showSuccessMessage = signal(false);

  protected readonly exportType = signal('');

  protected readonly loading = signal(true);

  protected readonly errorMsg = signal('');

  protected readonly stats = signal<UrbanismeStats>({
    totalDossiers: 0,
    dossiersEnAttente: 0,
    dossiersValides: 0,
    dossiersRejetes: 0,
    recettes: 0,
    });

  protected async loadStats() {
    try {
    this.loading.set(true);
    this.errorMsg.set('');
    const response = await this.urbanismeApi.getUrbanismeStats(this.selectedYear());
    if (response) {
    this.stats.set({
    totalDossiers: response.total ?? response.totalDossiers ?? 0,
    dossiersEnAttente: response.enAttente ?? response.dossiersEnAttente ?? 0,
    dossiersValides: response.valide ?? response.dossiersValides ?? 0,
    dossiersRejetes: response.rejete ?? response.dossiersRejetes ?? 0,
    recettes: response.montantTotal ?? response.recettes ?? 0,
    });
    }
    }
    catch {
    this.stats.set({
    totalDossiers: 0,
    dossiersEnAttente: 0,
    dossiersValides: 0,
    dossiersRejetes: 0,
    recettes: 0,
    });
    this.errorMsg.set("Impossible de charger les statistiques d'urbanisme.");
    }
    finally {
    this.loading.set(false);
    }
    }

  protected formatMontant(montant: number) {
    return new Intl.NumberFormat('fr-FR').format(montant);
    }

  protected readonly tauxValidation = computed(() => this.stats().totalDossiers > 0
    ? Math.round((this.stats().dossiersValides / this.stats().totalDossiers) * 100)
    : 0);

  protected readonly statsData = computed(() => [
    { label: 'Total dossiers', value: this.stats().totalDossiers.toString(), icon: 'ri-folder-line', color: 'teal' },
    { label: 'En attente', value: this.stats().dossiersEnAttente.toString(), icon: 'ri-time-line', color: 'amber' },
    { label: 'Validés', value: this.stats().dossiersValides.toString(), icon: 'ri-checkbox-circle-line', color: 'emerald' },
    { label: 'Recettes totales', value: `${this.formatMontant(this.stats().recettes)} Fcfa`, icon: 'ri-money-dollar-circle-line', color: 'cyan' }
    ]);

  protected handleExport(type: 'excel' | 'pdf') {
    this.exportType.set(type);
    this.showSuccessMessage.set(true);
    const link = document.createElement('a');
    link.href = '#';
    link.download = `statistiques-urbanisme-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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
