import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CurrentUser } from '../../core/auth/auth.models';
import { ChangePasswordForm } from './components/change-password-form';
import { ProfileApi } from '../../services/profile';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  AGENT: 'Agent',
  SERVICE_FINANCES: 'Service des finances',
  QUAI_PECHE: 'Quai de pêche',
  ETAT_CIVIL: 'État civil',
  REGISSEUR: 'Régisseur',
};

@Component({
  selector: 'app-profil-page',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChangePasswordForm],
  templateUrl: './page.html',
})
export class ProfilPage {
  protected readonly profileApi = inject(ProfileApi);
  protected readonly loading = signal(true);

  protected readonly me = signal<CurrentUser | null>(null);

  protected readonly errorMsg = signal('');

  protected readonly initials = computed(() => {
    const prenom = String(this.me()?.prenom || '').trim().charAt(0).toUpperCase();
    const nom = String(this.me()?.nom || '').trim().charAt(0).toUpperCase();
    return `${prenom}${nom}` || 'US';
    });

  protected readonly userRoleLabel = computed(() => ROLE_LABELS[String(this.me()?.role || '').toUpperCase()] || 'Agent');

  protected formatMe() {
    return this.me()?.createdAt ? new Date(this.me()!.createdAt!).toLocaleDateString('fr-FR') : '-';
  }

  constructor() {
    effect((onCleanup) => {
      void onCleanup;
      
      const cleanup = untracked(() => (() => {
    let mounted = true;
    this.profileApi.getMyProfile().then((data) => {
    if (!mounted)
    return;
    this.errorMsg.set('');
    this.me.set(data);
    })
    .catch(() => {
    if (!mounted)
    return;
    this.me.set(null);
    this.errorMsg.set("Impossible de charger le profil.");
    })
    .finally(() => {
    if (mounted)
    this.loading.set(false);
    });
    return () => {
    mounted = false;
    };
    })());
      if (typeof cleanup === 'function') onCleanup(cleanup);
    });
  }
}
