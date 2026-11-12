'use client';

import { useId } from 'react';

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Message d'erreur affiché sous le champ. */
  error?: string;
  /** Texte d'aide sous le champ. */
  hint?: React.ReactNode;
  wrapperClassName?: string;
}

/** Champ texte libellé (label relié, classe .input-field = 16px sur mobile). */
export default function TextField({ label, value, onChange, error, hint, wrapperClassName, className, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-d` : undefined}
        className={`input-field ${error ? '!border-red-500' : ''} ${className || ''}`} {...input}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={`text-xs mt-1 ${error ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>{error || hint}</p>
      )}
    </div>
  );
}
