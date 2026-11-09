import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DossierUrbanisme } from '../../../../services/urbanisme';
import { TaxService } from '../../../../services/taxes';

type NouveauDossierModalProps = {
  types: TaxService[];
  onClose: () => void;
  onCreated: (dossier: DossierUrbanisme) => Promise<void>;
};

const INPUT_CLASS =
  'w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all';

@Component({
  selector: 'app-field',
  host: { class: 'block', '[class.md:col-span-2]': 'wide()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './field.html',
})
export class Field {

  readonly label = input.required<string>();

  readonly icon = input.required<string>();

  readonly required = input<boolean | undefined>(undefined);

  readonly wide = input<boolean | undefined>(undefined);
}
