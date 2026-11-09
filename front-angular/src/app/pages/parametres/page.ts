import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { BackupFile, Penalite, Tarif } from '../../services/settings';
import { TarifsTab } from './components/tarifs-tab';
import { PenalitesTab } from './components/penalites-tab';
import { SauvegardeTab } from './components/sauvegarde-tab';
import { TarifModal } from './components/tarif-modal';
import { PenaliteModal } from './components/penalite-modal';
import { AuthService } from '../../core/auth/auth.service';
import { SettingsApi } from '../../services/settings';

type Tab = 'tarifs' | 'penalites' | 'sauvegarde';

type ModalState =
  | { type: 'tarif'; tarif?: Tarif }
  | { type: 'penalite'; penalite?: Penalite }
  | null;

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'tarifs', label: 'Tarifs', icon: 'ri-price-tag-3-line' },
  { id: 'penalites', label: 'Pénalités', icon: 'ri-alert-line' },
  { id: 'sauvegarde', label: 'Sauvegarde', icon: 'ri-database-2-line' },
];

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

@Component({
  selector: 'app-parametres',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TarifsTab, PenalitesTab, SauvegardeTab, TarifModal, PenaliteModal],
  templateUrl: './page.html',
})
export class Parametres {
  protected readonly TABS = TABS;
  protected readonly auth = inject(AuthService);
  protected readonly settingsApi = inject(SettingsApi);
  protected readonly readOnly = computed(() => !this.auth.canWriteRole());

  protected readonly activeTab = signal<Tab>('tarifs');

  protected readonly modal = signal<ModalState>(null);

  protected readonly notice = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  protected noticeTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };

  protected readonly loading = signal(false);

  protected readonly tarifs = signal<Tarif[]>([]);

  protected readonly penalites = signal<Penalite[]>([]);

  protected readonly backups = signal<BackupFile[]>([]);

  protected readonly categories = computed(() => Array.from(new Set(this.tarifs().map((tarif) => tarif.categorie))).sort((a, b) => a.localeCompare(b, 'fr')));

  protected notify(kind: 'success' | 'error', message: string) {
    clearTimeout(this.noticeTimer.current);
    this.notice.set({ kind, message });
    this.noticeTimer.current = setTimeout(() => this.notice.set(null), kind === 'success' ? 3000 : 4000);
    }

  protected showError(message: string) {
    return this.notify('error', message);
  }

  protected async loadData() {
    this.loading.set(true);
    try {
    const [tarifsData, penalitesData, backupsData] = await Promise.all([
    this.settingsApi.getTarifs(),
    this.settingsApi.getPenalites(),
    this.settingsApi.listBackups().catch(() => []),
    ]);
    this.tarifs.set(tarifsData);
    this.penalites.set(penalitesData);
    this.backups.set(backupsData);
    }
    catch (error) {
    this.showError(errorMessage(error, 'Impossible de charger les paramètres.'));
    }
    finally {
    this.loading.set(false);
    }
    }

  protected afterChange(message: string) {
    this.modal.set(null);
    this.notify('success', message);
    this.loadData();
    }

  protected async run(action: () => Promise<unknown>, success: string, failure: string) {
    try {
    await action();
    this.afterChange(success);
    }
    catch (error) {
    this.showError(errorMessage(error, failure));
    }
    }

  protected supprimerTarif(tarif: Tarif) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?'))
    return;
    this.run(() => this.settingsApi.deleteTarif(tarif.id), 'Tarif supprimé avec succès !', 'Impossible de supprimer le tarif.');
    }

  protected supprimerPenalite(penalite: Penalite) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pénalité ?'))
    return;
    this.run(() => this.settingsApi.deletePenalite(penalite.id), 'Pénalité supprimée avec succès !', 'Impossible de supprimer la pénalité.');
    }

  protected basculerPenalite(penalite: Penalite) {
    return this.run(() => this.settingsApi.updatePenalite(penalite.id, { actif: !penalite.actif }), 'Statut de la pénalité modifié !', 'Impossible de modifier la pénalité.');
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      
      const cleanup = untracked(() => (() => {
    this.loadData();
    return () => clearTimeout(this.noticeTimer.current);
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
