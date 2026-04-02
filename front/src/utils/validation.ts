// Form validation utilities

export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const required = (message = 'Ce champ est requis'): ValidationRule => ({
  validate: (value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },
  message,
});

export const minLength = (min: number, message?: string): ValidationRule<string> => ({
  validate: (value) => !value || value.length >= min,
  message: message || `Minimum ${min} caractères requis`,
});

export const maxLength = (max: number, message?: string): ValidationRule<string> => ({
  validate: (value) => !value || value.length <= max,
  message: message || `Maximum ${max} caractères autorisés`,
});

export const email = (message = 'Email invalide'): ValidationRule<string> => ({
  validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  message,
});

export const phone = (message = 'Numéro de téléphone invalide'): ValidationRule<string> => ({
  validate: (value) => !value || /^[\d\s+()-]{8,}$/.test(value),
  message,
});

export const nin = (message = 'NIN/CNI invalide'): ValidationRule<string> => ({
  validate: (value) => !value || value.length >= 5,
  message,
});

export const number = (message = 'Doit être un nombre'): ValidationRule<unknown> => ({
  validate: (value) => !value || !isNaN(Number(value)),
  message,
});

export const positiveNumber = (message = 'Doit être un nombre positif'): ValidationRule<unknown> => ({
  validate: (value) => !value || (Number(value) > 0),
  message,
});

export const date = (message = 'Date invalide'): ValidationRule<string> => ({
  validate: (value) => !value || !isNaN(Date.parse(value)),
  message,
});

export const min = (minValue: number, message?: string): ValidationRule<unknown> => ({
  validate: (value) => !value || Number(value) >= minValue,
  message: message || `Minimum ${minValue}`,
});

export const max = (maxValue: number, message?: string): ValidationRule<unknown> => ({
  validate: (value) => !value || Number(value) <= maxValue,
  message: message || `Maximum ${maxValue}`,
});

export function validateField<T>(value: T, rules: ValidationRule<T>[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  schema: Record<keyof T, ValidationRule<unknown>[]>
): ValidationResult {
  const errors: Record<string, string> = {};
  
  for (const field in schema) {
    const value = data[field];
    const rules = schema[field];
    const error = validateField(value, rules);
    if (error) {
      errors[field as string] = error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Common validation schemas
export const contribuableSchema = {
  nin: [required(), nin()],
  nom: [required(), minLength(2), maxLength(100)],
  prenom: [required(), minLength(2), maxLength(100)],
  dateNaiss: [required(), date()],
  lieuNaiss: [required()],
  adresse: [required(), minLength(5)],
  telephone: [required(), phone()],
  email: [email()],
  montantImpot: [required(), positiveNumber()],
};

export const transactionSchema = {
  contribuableId: [required()],
  type: [required()],
  service: [required()],
  montant: [required(), positiveNumber()],
  modePaiement: [required()],
  reference: [required()],
};

export const motoSchema = {
  matricule: [required(), minLength(5), maxLength(20)],
  marque: [required()],
  modele: [required()],
  annee: [required(), number(), min(1990), max(new Date().getFullYear())],
  couleur: [required()],
  proprietaireId: [required()],
};

export const formationSchema = {
  nom: [required(), minLength(3)],
  domaine: [required()],
  duree: [required()],
  responsable: [required()],
  budget: [required(), positiveNumber()],
  dateDebut: [required(), date()],
  dateFin: [required(), date()],
};
