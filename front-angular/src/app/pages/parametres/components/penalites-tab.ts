import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Penalite } from '../../../services/settings';
import { PRIMARY_BUTTON } from './ui';
import { SectionHeader } from './section-header';

@Component({
  selector: 'app-penalites-tab',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeader],
  templateUrl: './penalites-tab.html',
})
export class PenalitesTab {
  protected readonly PRIMARY_BUTTON = PRIMARY_BUTTON;

  readonly penalites = input.required<Penalite[]>();

  readonly add = output<void>();

  readonly edit = output<Penalite>();

  readonly toggled = output<Penalite>();

  readonly delete = output<Penalite>();

  readonly readOnly = input<boolean>(false);
}
