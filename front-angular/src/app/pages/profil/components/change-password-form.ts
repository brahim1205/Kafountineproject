import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { getErrorMessage } from '../../../utils/form-validation';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ProfileApi } from '../../../services/profile';

const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none';

const RULES = '12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.';

@Component({
  selector: 'app-change-password-form',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './change-password-form.html',
})
export class ChangePasswordForm {
  protected readonly INPUT_CLASS = INPUT_CLASS;
  protected readonly RULES = RULES;
  protected readonly toast = inject(ToastService);
  protected readonly profileApi = inject(ProfileApi);
  protected readonly saving = signal(false);

  protected readonly error = signal('');

  protected async handleSubmit(e: Event) {
    e.preventDefault();
    const form = (e.currentTarget as HTMLFormElement);
    const data = new FormData(form);
    const current = String(data.get('currentPassword') || '');
    const next = String(data.get('newPassword') || '');
    const confirm = String(data.get('confirmPassword') || '');
    this.error.set('');
    if (!current || !next) {
    this.error.set('Renseignez votre mot de passe actuel et le nouveau.');
    return;
    }
    if (next !== confirm) {
    this.error.set('La confirmation ne correspond pas au nouveau mot de passe.');
    return;
    }
    this.saving.set(true);
    try {
    await this.profileApi.changeMyPassword(current, next);
    form.reset();
    this.toast.show('Mot de passe modifié.', 'success');
    }
    catch (err) {
    this.error.set(getErrorMessage(err, 'Impossible de modifier le mot de passe.'));
    }
    finally {
    this.saving.set(false);
    }
    }
}
