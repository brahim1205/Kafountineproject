import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { UiPlace } from './places';
import { MarcheApi } from '../../../../services/marche';

@Component({
  selector: 'app-resiliation-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './resiliation-modal.html',
})
export class ResiliationModal {
  protected readonly marcheApi = inject(MarcheApi);
  readonly place = input.required<UiPlace>();

  readonly closed = output<void>();

  readonly done = output<void>();

  protected readonly submitting = signal(false);

  protected readonly error = signal('');

  protected async confirmer() {
    this.submitting.set(true);
    this.error.set('');
    try {
    await this.marcheApi.updatePlaceMarche(this.place().id, { occupantId: null, statut: 'LIBRE' });
    await this.done.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : 'Impossible de résilier l’attribution.');
    }
    finally {
    this.submitting.set(false);
    }
    }
}
