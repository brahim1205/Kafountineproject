import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed } from '@angular/core';
import { DossierUrbanisme } from '../../../../services/urbanisme';
import { TaxService } from '../../../../services/taxes';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/form-validation';
import { NATURES, montantPermis } from './dossiers';
import { ContribuablesApi } from '../../../../services/contribuables';
import { UrbanismeApi } from '../../../../services/urbanisme';
import { Field } from './field';

const INPUT_CLASS =
  'w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all';

@Component({
  selector: 'app-nouveau-dossier-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field],
  templateUrl: './nouveau-dossier-modal.html',
})
export class NouveauDossierModal {
  protected readonly NATURES = NATURES;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly Math = Math;
  protected readonly Object = Object;
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected readonly urbanismeApi = inject(UrbanismeApi);
  readonly types = input.required<TaxService[]>();

  readonly closed = output<void>();

  readonly created = output<DossierUrbanisme>();

  protected readonly typeId = signal('');

  protected readonly surface = signal('');

  protected readonly submitting = signal(false);

  protected readonly error = signal('');

  protected readonly permis = computed(() => this.types().find((type) => type.id === this.typeId()));

  protected readonly auMetreCarre = computed(() => this.permis()?.unite === 'm²');

  protected readonly surfaceSaisie = computed(() => this.auMetreCarre() ? Number.parseInt(this.surface(), 10) || undefined : undefined);

  protected readonly montant = computed(() => this.permis() ? montantPermis(this.permis()!, this.surfaceSaisie()) : 0);

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set('');
    if (!validateFormElement((e.currentTarget as HTMLFormElement)) || !this.permis()) {
    return;
    }
    this.submitting.set(true);
    try {
    const data = new FormData((e.currentTarget as HTMLFormElement));
    const field = (name: string) => ((data.get(name) as string) || '').trim();
    const contribuable = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('cni'),
    fullName: field('nomComplet'),
    telephone: field('telephone'),
    adresse: field('localisation'),
    });
    const dossier = await this.urbanismeApi.createDossierUrbanisme({
    contribuableId: contribuable.id,
    type: this.permis()!.id,
    description: field('description'),
    surface: this.surfaceSaisie(),
    localisation: field('localisation'),
    nature: field('nature'),
    montant: this.montant(),
    });
    await this.created.emit(dossier);
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible d'enregistrer le dossier");
    }
    finally {
    this.submitting.set(false);
    }
    }
}
