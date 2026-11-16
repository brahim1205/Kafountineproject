import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../shared/utils/form-validation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ForgotStatus = { kind: 'success' | 'error'; text: string } | null;

@Component({
  selector: 'app-login',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({ email: '', password: '' });
  protected readonly forgotEmail = signal('');
  protected readonly forgotStatus = signal<ForgotStatus>(null);
  protected readonly sendingReset = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showForgot = signal(false);
  protected readonly capsLock = signal(false);
  protected readonly clearFieldError = clearFieldValidationError;
  protected readonly year = new Date().getFullYear();

  protected async submit(event: Event): Promise<void> {
    if (this.submitting()) return;
    if (!validateFormElement(event.currentTarget as HTMLFormElement)) return;
    const { email, password } = this.form.getRawValue();
    this.errorMessage.set('');
    this.submitting.set(true);
    try {
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Connexion impossible');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Signale la touche Verr. Maj pendant la saisie du mot de passe. */
  protected checkCapsLock(event: KeyboardEvent): void {
    this.capsLock.set(typeof event.getModifierState === 'function' && event.getModifierState('CapsLock'));
  }

  protected openForgot(): void {
    this.forgotEmail.set(this.form.controls.email.value.trim());
    this.forgotStatus.set(null);
    this.errorMessage.set('');
    this.showForgot.set(true);
  }

  protected closeForgot(): void {
    this.showForgot.set(false);
    this.forgotStatus.set(null);
    this.forgotEmail.set('');
  }

  protected async sendReset(field: HTMLInputElement): Promise<void> {
    if (this.sendingReset()) return;
    this.forgotStatus.set(null);
    field.setCustomValidity('');
    const email = this.forgotEmail().trim();
    if (!email || !EMAIL_PATTERN.test(email)) {
      field.setCustomValidity(email ? 'Veuillez saisir une adresse email valide.' : 'Veuillez renseigner votre adresse email.');
      field.reportValidity();
      field.focus();
      return;
    }
    this.sendingReset.set(true);
    try {
      this.forgotStatus.set({ kind: 'success', text: await this.auth.requestPasswordReset(email) });
    } catch (error) {
      this.forgotStatus.set({ kind: 'error', text: getErrorMessage(error, "La demande n'a pas pu être envoyée.") });
    } finally {
      this.sendingReset.set(false);
    }
  }
}
