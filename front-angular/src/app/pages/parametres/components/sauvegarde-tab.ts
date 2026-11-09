import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { BackupFile } from '../../../services/settings';
import { PRIMARY_BUTTON } from './ui';
import { SettingsApi } from '../../../services/settings';

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

@Component({
  selector: 'app-sauvegarde-tab',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './sauvegarde-tab.html',
})
export class SauvegardeTab {
  protected readonly PRIMARY_BUTTON = PRIMARY_BUTTON;
  protected readonly settingsApi = inject(SettingsApi);
  readonly backups = input.required<BackupFile[]>();

  readonly changed = output<string>();

  readonly failed = output<string>();

  readonly readOnly = input<boolean>(false);

  protected readonly busy = signal(false);

  protected async run(action: () => Promise<string>, fallback: string) {
    this.busy.set(true);
    try {
    this.changed.emit(await action());
    }
    catch (error) {
    this.failed.emit(errorMessage(error, fallback));
    }
    finally {
    this.busy.set(false);
    }
    }

  protected create() {
    return this.run(async () => {
    await this.settingsApi.createBackup();
    return 'Sauvegarde créée avec succès.';
    }, 'La sauvegarde a échoué.');
  }

  protected restore(filename: string) {
    if (!confirm(`Restaurer la sauvegarde ${filename} ? Cette opération remplacera la base courante.`))
    return;
    this.run(async () => {
    await this.settingsApi.restoreBackup(filename);
    return `Restauration terminée depuis ${filename}.`;
    }, 'La restauration a échoué.');
    }

  protected async download(filename: string) {
    try {
    await this.settingsApi.downloadBackup(filename);
    }
    catch (error) {
    this.failed.emit(errorMessage(error, 'Le téléchargement a échoué.'));
    }
    }

  protected formatToLocaleString(backup: { createdAt: string | number | Date }) {
    return new Date(backup.createdAt).toLocaleString('fr-FR');
  }
}
