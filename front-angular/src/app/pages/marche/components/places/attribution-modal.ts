import { ChangeDetectionStrategy, Component, inject, input, output, signal, linkedSignal, computed } from '@angular/core';
import { clearFieldValidationError, validateFormElement } from '../../../../utils/form-validation';
import { ACTIVITES, INPUT_CLASS, PERIODES, formatTarif, UiPlace } from './places';
import { ContribuablesApi } from '../../../../services/contribuables';
import { MarcheApi } from '../../../../services/marche';
import { Label } from './label';
import { AuthService } from '../../../../core/auth/auth.service';

type Mode = 'nouveau' | 'existant';

@Component({
  selector: 'app-attribution-modal',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Label],
  templateUrl: './attribution-modal.html',
})
export class AttributionModal {
  protected readonly PERIODES = PERIODES;
  protected readonly formatTarif = formatTarif;
  protected readonly clearFieldValidationError = clearFieldValidationError;
  protected readonly ACTIVITES = ACTIVITES;
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly contribuablesApi = inject(ContribuablesApi);
  protected readonly marcheApi = inject(MarcheApi);
  private readonly auth = inject(AuthService);

  /** L'agent encaisse au tarif de la place : seul le régisseur modifie le tarif d'une place existante. */
  protected readonly tarifVerrouille = computed(() => this.mode() === 'existant' && this.auth.role() === 'agent');
  readonly initialPlace = input.required<UiPlace | null>();

  readonly placesDisponibles = input.required<UiPlace[]>();

  readonly types = input.required<string[]>();

  readonly zones = input.required<string[]>();

  readonly selectedYear = input.required<number>();

  readonly closed = output<void>();

  readonly done = output<void>();

  protected readonly mode = linkedSignal<Mode>(() => (this.initialPlace() || this.placesDisponibles().length > 0 ? 'existant' : 'nouveau'));

  protected readonly placeId = linkedSignal(() => (this.initialPlace()?.id || ''));

  protected readonly submitting = signal(false);

  protected readonly error = signal('');

  protected readonly place = computed(() => this.placesDisponibles().find((candidate) => candidate.id === this.placeId()));

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    this.error.set('');
    if (!validateFormElement((e.currentTarget as HTMLFormElement))) {
    return;
    }
    this.submitting.set(true);
    try {
    const formData = new FormData((e.currentTarget as HTMLFormElement));
    const field = (name: string) => ((formData.get(name) as string) || '').trim();
    const commercant = await this.contribuablesApi.ensureContribuableByIdentity({
    cni: field('cni'),
    fullName: field('nomComplet'),
    telephone: field('telephone'),
    adresse: field('adresse'),
    });
    const attribution = {
    occupantId: commercant.id,
    activite: field('activite'),
    tarif: Number(field('tarif')),
    periode: field('periode'),
    statut: 'OCCUPEE',
    };
    if (this.mode() === 'existant') {
    await this.marcheApi.updatePlaceMarche(this.placeId(), attribution);
    }
    else {
    await this.marcheApi.createPlaceMarche({ ...attribution, numeroPlace: field('numeroPlace'), type: field('type'), zone: field('zone'), year: this.selectedYear() });
    }
    await this.done.emit();
    }
    catch (err) {
    this.error.set(err instanceof Error ? err.message : "Impossible d'attribuer la place");
    }
    finally {
    this.submitting.set(false);
    }
    }

  protected asSummary() {
    return ([
    ['existant', 'Place existante', `${this.placesDisponibles().length} disponible(s)`],
    ['nouveau', 'Nouvelle place', 'Créer et attribuer'],
    ] as const);
  }

  protected pERIODESSummary() {
    return PERIODES.some((p) => p.value === this.place()?.periode) ? this.place()?.periode : 'mois';
  }
}
