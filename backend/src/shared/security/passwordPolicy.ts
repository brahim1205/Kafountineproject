import { ValidationError } from '../errors/AppError';

export function validateStrongPassword(password: string) {
  const value = password.trim();
  const hasMinLength = value.length >= 12;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    throw new ValidationError(
      'Le mot de passe doit contenir au moins 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial.'
    );
  }
}
