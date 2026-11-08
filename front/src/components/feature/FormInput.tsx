import { useState } from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'time' | 'textarea';
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  className?: string;
}

export default function FormInput({
  label,
  name,
  type = 'text',
  required = false,
  defaultValue = '',
  placeholder = '',
  min,
  max,
  minLength,
  maxLength,
  options = [],
  value,
  onChange,
  className = '',
}: FormInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = (value: string): string | null => {
    if (required && !value.trim()) {
      return `${label} est obligatoire`;
    }
    if (minLength !== undefined && value.length < minLength) {
      return `${label} doit contenir au moins ${minLength} caractères`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${label} doit contenir au plus ${maxLength} caractères`;
    }
    if (type === 'email' && value) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(value)) {
        return 'Adresse email invalide';
      }
    }
    if (type === 'tel' && value) {
      // Validation numéro téléphone Sénégal
      const cleaned = value.replace(/\s/g, '');
      const phoneRegex = /^(?:\+?221|0)?(70|75|76|77|78)\d{7}$/;
      if (!phoneRegex.test(cleaned)) {
        return 'Numéro de téléphone sénégalais invalide (ex: 77 123 45 67)';
      }
    }
    if (type === 'number' && value) {
      if (min !== undefined && Number(value) < min) {
        return `La valeur minimale est ${min}`;
      }
      if (max !== undefined && Number(value) > max) {
        return `La valeur maximale est ${max}`;
      }
    }
    return null;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched(true);
    const errorMessage = validate(e.currentTarget.value);
    setError(errorMessage);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
    if (touched) {
      const errorMessage = validate(e.currentTarget.value);
      setError(errorMessage);
    }
  };

  const baseInputClass = `w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors ${
    error
      ? 'border-red-300 bg-red-50 focus:ring-red-500'
      : 'border-gray-300 focus:border-emerald-500'
  } ${className}`;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {options.length > 0 ? (
        <select
          name={name}
          value={value ?? defaultValue}
          onChange={onChange}
          onBlur={handleBlur}
          className={baseInputClass}
        >
          <option value="">Sélectionner...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value ?? defaultValue}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseInputClass}
          rows={3}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value ?? defaultValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          maxLength={maxLength}
          className={baseInputClass}
        />
      )}

      {error && touched && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <i className="ri-error-warning-line"></i>
          {error}
        </p>
      )}
    </div>
  );
}
