'use client';

/** Barre de recherche responsive (pleine largeur sur mobile) pour les listes. */
export default function ListToolbar({ value, onChange, onSubmit, placeholder = 'Rechercher...', children }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder?: string; children?: React.ReactNode;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex flex-wrap items-center gap-2 mb-4" role="search">
      <input
        type="search" inputMode="search" enterKeyHint="search" value={value} onChange={(e) => onChange(e.target.value)}
        className="input-field flex-1 min-w-[180px] sm:max-w-xs" placeholder={placeholder} aria-label="Rechercher"
      />
      <button type="submit" className="btn-primary">Rechercher</button>
      {children}
    </form>
  );
}
