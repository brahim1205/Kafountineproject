import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboard } from './components/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard';
import { EtatCivilDashboard } from './components/etat-civil-dashboard';
import { QuaiPecheDashboard } from './components/quai-peche-dashboard';
import { RegisseurDashboard } from './components/regisseur-dashboard';
import { ServiceFinancesDashboard } from './components/service-finances-dashboard';
import { SuperAdminDashboard } from './components/super-admin-dashboard';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminDashboard, AgentDashboard, EtatCivilDashboard, QuaiPecheDashboard, RegisseurDashboard, ServiceFinancesDashboard, SuperAdminDashboard],
  template: `
    @switch (role()) {
      @case ('super_admin') { <app-super-admin-dashboard /> }
      @case ('agent') { <app-agent-dashboard /> }
      @case ('regisseur') { <app-regisseur-dashboard /> }
      @case ('etat_civil') { <app-etat-civil-dashboard /> }
      @case ('service_finances') { <app-service-finances-dashboard /> }
      @case ('quai_peche') { <app-quai-peche-dashboard /> }
      @default { <app-admin-dashboard /> }
    }
  `,
})
export class Dashboard {
  protected readonly role = inject(AuthService).role;
}
