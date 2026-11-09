import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ServiceFinancesDashboard } from '../dashboard/components/service-finances-dashboard';

@Component({
  selector: 'app-service-finances-page',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ServiceFinancesDashboard],
  templateUrl: './page.html',
})
export class ServiceFinancesPage {


}
