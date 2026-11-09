import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

/** Demande un motif avant une opération sensible (annulation, réouverture). */
@Component({
  selector: 'app-annulation-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4" role="dialog" aria-modal="true" [attr.aria-label]="titre()">
        <h2 class="text-lg font-semibold text-gray-900">{{ titre() }}</h2>
        <p class="text-sm text-gray-600">{{ description() }}</p>
        <div>
          <label for="motif-annulation" class="block text-sm font-medium text-gray-700 mb-1">Motif (obligatoire)</label>
          <textarea id="motif-annulation" rows="3" maxlength="300" [value]="motif()" (input)="motif.set($any($event.target).value)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>
        </div>
        <div class="flex gap-3">
          <button type="button" (click)="closed.emit()" [disabled]="busy()" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg cursor-pointer">Fermer</button>
          <button type="button" (click)="confirmed.emit(motif().trim())" [disabled]="!valide() || busy()"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg cursor-pointer disabled:opacity-50">{{ action() }}</button>
        </div>
      </div>
    </div>
  `,
})
export class AnnulationModal {
  readonly titre = input.required<string>();
  readonly description = input.required<string>();
  readonly action = input('Confirmer');
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<string>();
  protected readonly motif = signal('');
  protected readonly valide = computed(() => this.motif().trim().length >= 3);
}
