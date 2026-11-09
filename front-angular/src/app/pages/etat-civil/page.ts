import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EtatCivilWorkspace } from './etat-civil-workspace';

@Component({
  selector: 'app-etat-civil-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EtatCivilWorkspace],
  templateUrl: './page.html',
})
export class EtatCivilPage {


}
