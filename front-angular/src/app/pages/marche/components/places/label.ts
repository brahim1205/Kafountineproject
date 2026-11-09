import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiPlace } from './places';

type Mode = 'nouveau' | 'existant';

type AttributionModalProps = {
  /** Place disponible présélectionnée (clic sur une ligne du tableau). */
  initialPlace: UiPlace | null;
  placesDisponibles: UiPlace[];
  types: string[];
  zones: string[];
  selectedYear: number;
  onClose: () => void;
  onDone: () => Promise<void>;
};

@Component({
  selector: 'app-label',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './label.html',
})
export class Label {

  readonly required = input<boolean | undefined>(undefined);
}
