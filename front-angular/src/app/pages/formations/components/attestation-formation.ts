import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Attestation } from '../../../services/formations';

/** Attestation de formation, imprimable (A4 paysage), délivrée aux jeunes certifiés. */
@Component({
  selector: 'app-attestation-formation',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    @media print {
      @page { size: A4 landscape; margin: 0; }
      body * { visibility: hidden !important; }
      #attestation-content, #attestation-content * { visibility: visible !important; }
      #attestation-content { position: fixed !important; inset: 0 !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
      .no-print { display: none !important; }
    }
  `],
  template: `
    <div class="no-print fixed inset-0 z-50 bg-gray-900/50" (click)="closed.emit()"></div>
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full flex-col items-center justify-center gap-4 p-4">
        <div id="attestation-content" class="w-full max-w-4xl rounded-lg bg-white p-10 shadow-xl">
          <div class="h-full rounded border-4 border-double border-emerald-800 p-10 text-center">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">République du Sénégal · Région de Ziguinchor · Département de Bignona</p>
            <div class="mt-4 flex items-center justify-center gap-3">
              <img src="/logo.jpeg" alt="Logo de la commune de Kafountine" class="h-14 w-14 rounded-full object-contain" />
              <p class="text-lg font-semibold text-gray-900">Commune de Kafountine</p>
            </div>
            <h1 class="mt-8 text-4xl font-bold tracking-wide text-emerald-900">Attestation de formation</h1>
            <p class="mt-2 text-sm text-gray-500">N° {{ attestation().numero }}</p>
            <p class="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-gray-800">
              Le Maire de la commune de Kafountine atteste que
              <b>{{ attestation().sexe === 'F' ? 'Mme' : 'M.' }} {{ attestation().prenom }} {{ attestation().nom }}</b>,
              né{{ attestation().sexe === 'F' ? 'e' : '' }} le {{ date(attestation().dateNaissance) }}, titulaire de la CNI n° {{ attestation().cni }},
              a suivi avec succès la formation <b>« {{ attestation().formation }} »</b> ({{ attestation().domaine }}, {{ attestation().duree }}),
              organisée par la commune du {{ date(attestation().dateDebut) }} au {{ date(attestation().dateFin) }},
              avec une assiduité de {{ attestation().tauxAssiduite }} %.
            </p>
            <div class="mt-12 flex items-end justify-between text-left text-sm text-gray-700">
              <div>
                <p>Fait à Kafountine, le {{ date(aujourdhui) }}</p>
                <p class="mt-1">Responsable de la formation : {{ attestation().responsable }}</p>
              </div>
              <div class="text-center">
                <p class="font-semibold">Le Maire</p>
                <div class="mt-16 w-48 border-t border-gray-400"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-print flex gap-3">
          <button type="button" (click)="imprimer()" class="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"><i class="ri-printer-line mr-1" aria-hidden="true"></i>Imprimer</button>
          <button type="button" (click)="closed.emit()" class="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Fermer</button>
        </div>
      </div>
    </div>
  `,
})
export class AttestationFormation {
  readonly attestation = input.required<Attestation>();
  readonly closed = output<void>();
  protected readonly aujourdhui = new Date().toISOString();

  protected date(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected imprimer(): void {
    window.print();
  }
}
