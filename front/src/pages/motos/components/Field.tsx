import type { InputHTMLAttributes } from 'react';

export const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  className?: string;
};

/** Champ de formulaire libellé ; `required` s'appuie sur la validation de utils/formValidation. */
export default function Field({ label, required, className, ...input }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type="text" {...input} data-required={required ? 'true' : undefined} className={INPUT_CLASS} />
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mt-4">
      <i className="ri-error-warning-line mr-2"></i>
      {message}
    </div>
  );
}
