import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { clearFieldValidationError, getErrorMessage, validateFormElement } from '../../shared/utils/form-validation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({ email: '', password: '', rememberMe: false });
  protected readonly forgotEmail = signal('');
  protected readonly forgotMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showForgot = signal(false);
  protected readonly clearFieldError = clearFieldValidationError;

  protected async submit(event: Event): Promise<void> {
    if (!validateFormElement(event.currentTarget as HTMLFormElement)) return;
    const { email, password } = this.form.getRawValue();
    this.errorMessage.set('');
    this.submitting.set(true);
    try {
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Connexion impossible');
    } finally {
      this.submitting.set(false);
    }
  }

  protected closeForgot(): void {
    this.showForgot.set(false);
    this.forgotMessage.set('');
    this.forgotEmail.set('');
  }

  protected async sendReset(field: HTMLInputElement): Promise<void> {
    this.forgotMessage.set('');
    field.setCustomValidity('');
    const email = this.forgotEmail().trim();
    if (!email || !EMAIL_PATTERN.test(email)) {
      field.setCustomValidity(email ? 'Veuillez saisir une adresse email valide.' : "Veuillez renseigner l'adresse email de réinitialisation.");
      field.reportValidity();
      field.focus();
      return;
    }
    try {
      this.forgotMessage.set(await this.auth.requestPasswordReset(this.forgotEmail()));
    } catch (error) {
      this.forgotMessage.set(getErrorMessage(error, "La demande de réinitialisation n'a pas pu être envoyée."));
    }
  }
}
