import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ContribuablesApi } from '../../services/contribuables';
import { ContribuableSelect, requireSelectedContribuable } from './contribuable-select';

/**
 * Payeur d'une recette : un contribuable déjà enregistré, ou un nouveau saisi sur place (nom, téléphone, CNI facultative),
 * retrouvé par sa CNI ou créé. Le formulaire parent appelle `resoudre(form)` avant d'envoyer la recette.
 */
@Component({
  selector: 'app-payeur-field',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContribuableSelect],
  template: `
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="text-sm font-medium text-gray-700">Payeur (contribuable)</span>
      <button type="button" (click)="nouveau.set(!nouveau())" class="text-xs font-medium text-emerald-700 hover:underline">
        {{ nouveau() ? 'Choisir un contribuable existant' : 'Nouveau payeur' }}</button>
    </div>
    @if (nouveau()) {
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="payeurCni" aria-label="CNI du payeur (facultatif)" placeholder="CNI (facultatif)" [class]="inputClassName()" />
        <input name="payeurNom" aria-label="Prénom et nom du payeur" placeholder="Prénom et nom" data-required="true" [class]="inputClassName()" />
        <input name="payeurTelephone" aria-label="Téléphone du payeur" placeholder="Téléphone" data-required="true" [class]="inputClassName()" />
      </div>
    } @else {
      <app-contribuable-select name="contribuableId" [inputClassName]="inputClassName()"></app-contribuable-select>
    }
  `,
})
export class PayeurField {
  private readonly contribuablesApi = inject(ContribuablesApi);
  readonly inputClassName = input.required<string>();
  protected readonly nouveau = signal(false);

  /** Identifiant du payeur, ou null si la saisie est incomplète (le champ fautif est signalé). */
  async resoudre(form: HTMLFormElement): Promise<string | null> {
    if (!this.nouveau()) return requireSelectedContribuable(form, 'contribuableId');
    const champ = (nom: string) => form.elements.namedItem(nom) as HTMLInputElement | null;
    for (const nom of ['payeurNom', 'payeurTelephone']) {
      const input = champ(nom);
      if (input && !input.value.trim()) {
        input.setCustomValidity('Champ requis');
        input.reportValidity();
        input.setCustomValidity('');
        input.focus();
        return null;
      }
    }
    const contribuable = await this.contribuablesApi.ensureContribuableByIdentity({
      cni: champ('payeurCni')!.value.trim(),
      fullName: champ('payeurNom')!.value.trim(),
      telephone: champ('payeurTelephone')!.value.trim(),
    });
    return contribuable.id;
  }

  /** Nom affiché sur le reçu. */
  nomAffiche(form: HTMLFormElement): string {
    const valeur = (nom: string) => (form.elements.namedItem(nom) as HTMLInputElement | null)?.value.trim() ?? '';
    return this.nouveau() ? valeur('payeurNom') : valeur('contribuableRecherche').replace(/\s*\(.*\)$/, '');
  }
}
