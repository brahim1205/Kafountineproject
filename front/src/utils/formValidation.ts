import type { FormEvent } from 'react';

export type FieldElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function normalizeLabel(rawLabel: string): string {
  return rawLabel.replace(/\s*\*+\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFieldLabel(field: FieldElement): string {
  const ariaLabel = field.getAttribute('aria-label');
  if (ariaLabel) {
    return normalizeLabel(ariaLabel);
  }

  const dataLabel = field.getAttribute('data-label');
  if (dataLabel) {
    return normalizeLabel(dataLabel);
  }

  if (field.id) {
    const linkedLabel = field.form?.querySelector(`label[for="${field.id}"]`);
    if (linkedLabel?.textContent) {
      return normalizeLabel(linkedLabel.textContent);
    }
  }

  const parentLabel = field.closest('div')?.querySelector('label');
  if (parentLabel?.textContent) {
    return normalizeLabel(parentLabel.textContent);
  }

  return normalizeLabel(field.name || 'ce champ');
}

function getFieldValue(field: FieldElement): string {
  if (field instanceof HTMLInputElement && field.type === 'file') {
    return field.files?.length ? field.files[0]?.name || '' : '';
  }

  return field.value.trim();
}

function buildValidationMessage(field: FieldElement, label: string): string | null {
  const value = getFieldValue(field);
  const isRequired = field.dataset.required === 'true';

  if (isRequired && !value) {
    return `Veuillez renseigner ${label.toLowerCase()}.`;
  }

  if (!value) {
    return null;
  }

  if (field instanceof HTMLInputElement) {
    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Veuillez saisir une adresse email valide.';
      }
    }

    if (field.type === 'tel') {
      const cleaned = value.replace(/[^\d+]/g, '');
      if (cleaned.length < 8) {
        return `Le numéro saisi pour ${label.toLowerCase()} est trop court.`;
      }
    }

    if (field.type === 'number') {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        return `Veuillez saisir un nombre valide pour ${label.toLowerCase()}.`;
      }

      if (field.min && parsed < Number(field.min)) {
        return `${label} doit être supérieur ou égal à ${field.min}.`;
      }

      if (field.max && parsed > Number(field.max)) {
        return `${label} doit être inférieur ou égal à ${field.max}.`;
      }
    }

    if (field.type === 'date' && Number.isNaN(Date.parse(value))) {
      return `Veuillez saisir une date valide pour ${label.toLowerCase()}.`;
    }
  }

  if (field.minLength > 0 && value.length < field.minLength) {
    return `${label} doit contenir au moins ${field.minLength} caractères.`;
  }

  if (field.maxLength > 0 && value.length > field.maxLength) {
    return `${label} ne doit pas dépasser ${field.maxLength} caractères.`;
  }

  if (field.pattern) {
    const regex = new RegExp(field.pattern);
    if (!regex.test(value)) {
      return field.dataset.patternMessage || `Le format saisi pour ${label.toLowerCase()} n'est pas valide.`;
    }
  }

  return null;
}

export function clearFieldValidationError(event: FormEvent<HTMLFormElement>) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    target.setCustomValidity('');
  }
}

export function validateFormElement(form: HTMLFormElement): boolean {
  const fields = Array.from(form.elements).filter(
    (field): field is FieldElement =>
      (field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement) &&
      field.name !== '' &&
      !field.disabled,
  );

  let firstInvalidField: FieldElement | null = null;

  for (const field of fields) {
    field.setCustomValidity('');
    const label = getFieldLabel(field);
    const message = buildValidationMessage(field, label);

    if (message) {
      field.setCustomValidity(message);
      firstInvalidField = firstInvalidField || field;
    }
  }

  if (firstInvalidField) {
    firstInvalidField.reportValidity();
    firstInvalidField.focus();
    return false;
  }

  return true;
}

export function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallbackMessage;
}
