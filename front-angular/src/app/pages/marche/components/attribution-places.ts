import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { PlacesTable } from './places/places-table';
import { PlaceDetailModal } from './places/place-detail-modal';
import { ResiliationModal } from './places/resiliation-modal';
import { AttributionModal } from './places/attribution-modal';
import { INPUT_CLASS, TYPES_PLACE, optionsFrom, toUiPlace, UiPlace } from './places/places';
import { YearService } from '../../../core/year/year.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MarcheApi } from '../../../services/marche';

type Modal = { type: 'attribution'; place: UiPlace | null } | { type: 'detail' | 'resiliation'; place: UiPlace } | null;

@Component({
  selector: 'app-attribution-places',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlacesTable, PlaceDetailModal, ResiliationModal, AttributionModal],
  templateUrl: './attribution-places.html',
})
export class AttributionPlaces {
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly yearService = inject(YearService);
  protected readonly auth = inject(AuthService);
  protected readonly marcheApi = inject(MarcheApi);
  protected readonly selectedYear = this.yearService.selectedYear;

  protected readonly isCurrentYear = computed(() => this.selectedYear() === new Date().getFullYear());

  protected readonly userRole = computed(() => this.auth.role() || 'admin');

  protected readonly canManage = computed(() => this.auth.canWriteRole(this.userRole()) && this.isCurrentYear());

  protected readonly places = signal<UiPlace[]>([]);

  protected readonly modal = signal<Modal>(null);

  protected readonly filterStatut = signal('tous');

  protected readonly filterType = signal('tous');

  protected readonly error = signal('');

  protected readonly successMessage = signal('');

  protected async loadPlaces() {
    try {
    this.error.set('');
    this.places.set((await this.marcheApi.listPlacesMarche(this.selectedYear())).map(toUiPlace));
    }
    catch {
    this.places.set([]);
    this.error.set('Impossible de charger les places du marché.');
    }
    }

  protected readonly types = computed(() => optionsFrom(TYPES_PLACE, this.places().map((p) => p.type)));

  protected readonly zones = computed(() => optionsFrom([], this.places().map((p) => p.zone)));

  protected readonly disponibles = computed(() => this.places().filter((p) => p.statut === 'Disponible'));

  protected readonly filteredPlaces = computed(() => this.places().filter((place) => (this.filterStatut() === 'tous' || place.statut === this.filterStatut()) && (this.filterType() === 'tous' || place.type === this.filterType())));

  protected readonly stats = computed(() => {
    const total = this.places().length;
    const occupees = this.places().filter((p) => p.statut === 'Occupée').length;
    return [
    { label: 'Places totales', value: total, icon: 'ri-store-2-line', tone: 'bg-cyan-100 text-cyan-600' },
    { label: 'Places occupées', value: occupees, icon: 'ri-checkbox-circle-line', tone: 'bg-emerald-100 text-emerald-600' },
    { label: 'Places disponibles', value: total - occupees, icon: 'ri-time-line', tone: 'bg-yellow-100 text-yellow-600' },
    { label: "Taux d'occupation", value: `${total ? Math.round((occupees / total) * 100) : 0}%`, icon: 'ri-percent-line', tone: 'bg-sky-100 text-sky-600' },
    ];
    });

  protected afterChange(message: string) {
    return async () => {
    this.modal.set(null);
    await this.loadPlaces();
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
    };
  }

  constructor() {
    effect(() => {
      this.selectedYear();
      untracked(() => {
    this.loadPlaces();
      });
    });
  }
}
