import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminDashboard } from './admin-dashboard';

/** Le super administrateur voit la même vue d'ensemble que le maire, avec son propre accueil. */
@Component({
  selector: 'app-super-admin-dashboard',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminDashboard],
  template: '<app-admin-dashboard [titre]="titre()" />',
})
export class SuperAdminDashboard {
  private readonly auth = inject(AuthService);
  protected readonly titre = computed(() => {
    const prenom = (this.auth.userName() || '').split(' ')[0];
    return prenom ? `Bonjour, ${prenom}` : 'Bonjour';
  });
}
