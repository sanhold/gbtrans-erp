'use client';

import { useMemo, useState } from 'react';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface PickerFieldProps {
  value: string;
  onChange: (id: string) => void;
  options: PickerOption[];
  placeholder?: string;
  title?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function PickerField({
  value, onChange, options, placeholder = 'Sélectionner...', title = 'Sélectionner',
  searchPlaceholder = 'Rechercher...', allowClear = true, disabled, required, className,
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find(o => o.id === value) || null;

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (id: string) => { onChange(id); setOpen(false); setQuery(''); };
  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`input-field flex items-center justify-between gap-2 text-left ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className || ''}`}
      >
        <span className={selected ? 'text-gray-900 dark:text-white truncate' : 'text-gray-400 truncate'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 animate-fade-in p-4" onClick={close}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-base">{title}</h3>
              <button type="button" onClick={close} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 border-b border-gray-100 dark:border-surface-700">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={searchPlaceholder} className="input-field pl-9 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {!required && allowClear && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-surface-700 ${!value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-medium' : 'text-gray-500'}`}
                >
                  — Aucun —
                </button>
              )}
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Aucun résultat</p>
              ) : filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-700 ${o.id === value ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  <p className={`text-sm font-medium truncate ${o.id === value ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>{o.label}</p>
                  {o.sublabel && <p className="text-xs text-gray-400 truncate">{o.sublabel}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
